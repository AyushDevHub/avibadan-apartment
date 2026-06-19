const prisma = require('../config/prisma');

// Generate a maintenance bill for every active flat for a given month
async function generateBills(req, res) {
  const { month, dueDate } = req.body; // month: 'YYYY-MM'
  if (!month || !dueDate) return res.status(400).json({ message: 'month and dueDate are required' });

  const flats = await prisma.flat.findMany({ where: { status: 'ACTIVE' } });

  const created = [];
  for (const flat of flats) {
    const existing = await prisma.maintenanceBill.findUnique({
      where: { flatId_month: { flatId: flat.id, month } },
    });
    if (existing) continue;

    const bill = await prisma.maintenanceBill.create({
      data: {
        flatId: flat.id,
        month,
        amount: flat.monthlyRate,
        dueDate: new Date(dueDate),
        status: 'UNPAID',
      },
    });
    created.push(bill);
  }

  res.status(201).json({ createdCount: created.length, bills: created });
}

async function listBills(req, res) {
  const { month, status, flatId } = req.query;
  const bills = await prisma.maintenanceBill.findMany({
    where: {
      ...(month && { month }),
      ...(status && { status }),
      ...(flatId && { flatId }),
    },
    include: { flat: true },
    orderBy: [{ month: 'desc' }, { flat: { flatNumber: 'asc' } }],
  });
  res.json(bills);
}

async function updateBill(req, res) {
  const { amount, dueDate, status, note } = req.body;
  const bill = await prisma.maintenanceBill.update({
    where: { id: req.params.id },
    data: {
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
      ...(status !== undefined && { status }),
      ...(note !== undefined && { note }),
    },
  });
  res.json(bill);
}

// Mark a bill as waived (e.g. adjusted against future work, like Ukil Shaw's 2025 dues)
async function waiveBill(req, res) {
  const { note } = req.body;
  const bill = await prisma.maintenanceBill.update({
    where: { id: req.params.id },
    data: { status: 'WAIVED', note: note || 'Waived/adjusted' },
  });
  res.json(bill);
}

module.exports = { generateBills, listBills, updateBill, waiveBill };
