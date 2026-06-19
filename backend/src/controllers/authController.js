const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt');

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    include: { flat: true },
  });
  if (!user) return res.status(401).json({ message: 'Incorrect username or password' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Incorrect username or password' });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, username: user.username, role: user.role, flat: user.flat },
  });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { flat: true } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ id: user.id, name: user.name, username: user.username, role: user.role, flat: user.flat });
}

// Admin creates a personal login for a flat member (one flat can have multiple logins,
// e.g. husband and wife, but each needs a distinct username)
async function createResidentUser(req, res) {
  const { name, username, password, flatId, phone } = req.body;
  if (!name || !username || !password || !flatId) {
    return res.status(400).json({ message: 'name, username, password, flatId are required' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      username: username.trim().toLowerCase(),
      phone,
      passwordHash,
      flatId,
      role: 'RESIDENT',
    },
  });
  res.status(201).json({ id: user.id, name: user.name, username: user.username });
}

// List logins for a given flat (admin only) so the admin can see who already has access
async function listFlatUsers(req, res) {
  const users = await prisma.user.findMany({
    where: { flatId: req.params.flatId },
    select: { id: true, name: true, username: true, createdAt: true },
  });
  res.json(users);
}

module.exports = { login, me, createResidentUser, listFlatUsers };
