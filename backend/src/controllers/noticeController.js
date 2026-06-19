const prisma = require('../config/prisma');

async function listNotices(req, res) {
  const notices = await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(notices);
}

async function createNotice(req, res) {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: 'title and content are required' });

  const notice = await prisma.notice.create({
    data: { title, content, postedBy: req.user.id },
  });
  res.status(201).json(notice);
}

async function deleteNotice(req, res) {
  await prisma.notice.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

module.exports = { listNotices, createNotice, deleteNotice };
