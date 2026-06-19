const prisma = require('../config/prisma');
const { appendCashTransaction } = require('./paymentController');

async function listStaff(req, res) {
  const staff = await prisma.staff.findMany({
    include: { salaryPayments: { orderBy: { month: 'desc' } } },
    orderBy: { name: 'asc' },
  });
  res.json(staff);
}

async function createStaff(req, res) {
  const { name, role, salary, joiningDate } = req.body;
  if (!name || !role || salary == null || !joiningDate) {
    return res.status(400).json({ message: 'name, role, salary, joiningDate are required' });
  }
  const staff = await prisma.staff.create({
    data: { name, role, salary: Number(salary), joiningDate: new Date(joiningDate) },
  });
  res.status(201).json(staff);
}

async function updateStaff(req, res) {
  const { name, role, salary, status } = req.body;
  const staff = await prisma.staff.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(salary !== undefined && { salary: Number(salary) }),
      ...(status !== undefined && { status }),
    },
  });
  res.json(staff);
}

// Mark a month's salary as paid - posts to cash ledger as an expense
async function paySalary(req, res) {
  const { month, amount, datePaid } = req.body;
  if (!month) return res.status(400).json({ message: 'month is required' });

  const staff = await prisma.staff.findUnique({ where: { id: req.params.id } });
  if (!staff) return res.status(404).json({ message: 'Staff not found' });

  const payAmount = amount != null ? Number(amount) : staff.salary;
  const date = datePaid ? new Date(datePaid) : new Date();

  const record = await prisma.salaryPayment.upsert({
    where: { staffId_month: { staffId: staff.id, month } },
    update: { amount: payAmount, datePaid: date, status: 'PAID' },
    create: { staffId: staff.id, month, amount: payAmount, datePaid: date, status: 'PAID' },
  });

  await appendCashTransaction({
    date,
    type: 'OUT',
    amount: payAmount,
    description: `Salary - ${staff.name} (${staff.role}) - ${month}`,
    refType: 'SALARY',
    refId: record.id,
  });

  res.json(record);
}

module.exports = { listStaff, createStaff, updateStaff, paySalary };
