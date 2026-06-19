const prisma = require('../config/prisma');

async function listFlats(req, res) {
  const flats = await prisma.flat.findMany({ orderBy: { flatNumber: 'asc' } });

  const flatsWithDue = await Promise.all(
    flats.map(async (flat) => {
      const bills = await prisma.maintenanceBill.findMany({ where: { flatId: flat.id } });
      const payments = await prisma.payment.findMany({ where: { flatId: flat.id } });
      const totalBilled = bills.filter((b) => b.status !== 'WAIVED').reduce((s, b) => s + b.amount, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      return { ...flat, totalDue: Math.max(totalBilled - totalPaid, 0) };
    })
  );

  res.json(flatsWithDue);
}

async function getFlat(req, res) {
  const flat = await prisma.flat.findUnique({ where: { id: req.params.id } });
  if (!flat) return res.status(404).json({ message: 'Flat not found' });

  const bills = await prisma.maintenanceBill.findMany({
    where: { flatId: flat.id },
    orderBy: { month: 'asc' },
  });
  const payments = await prisma.payment.findMany({
    where: { flatId: flat.id },
    orderBy: { date: 'asc' },
  });

  const totalBilled = bills.filter((b) => b.status !== 'WAIVED').reduce((s, b) => s + b.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  res.json({ ...flat, bills, payments, totalDue: Math.max(totalBilled - totalPaid, 0) });
}

async function createFlat(req, res) {
  const { flatNumber, ownerName, phone, email, monthlyRate, status } = req.body;
  if (!flatNumber || !ownerName || monthlyRate == null) {
    return res.status(400).json({ message: 'flatNumber, ownerName, monthlyRate are required' });
  }
  const flat = await prisma.flat.create({
    data: { flatNumber, ownerName, phone, email, monthlyRate: Number(monthlyRate), status: status || 'ACTIVE' },
  });
  res.status(201).json(flat);
}

async function updateFlat(req, res) {
  const { flatNumber, ownerName, phone, email, monthlyRate, status } = req.body;
  const flat = await prisma.flat.update({
    where: { id: req.params.id },
    data: {
      ...(flatNumber !== undefined && { flatNumber }),
      ...(ownerName !== undefined && { ownerName }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(monthlyRate !== undefined && { monthlyRate: Number(monthlyRate) }),
      ...(status !== undefined && { status }),
    },
  });
  res.json(flat);
}

async function deleteFlat(req, res) {
  await prisma.flat.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

module.exports = { listFlats, getFlat, createFlat, updateFlat, deleteFlat };
