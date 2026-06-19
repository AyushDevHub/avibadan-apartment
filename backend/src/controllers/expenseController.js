const prisma = require('../config/prisma');
const { appendCashTransaction } = require('./paymentController');

async function listExpenses(req, res) {
  const { month, category, from, to } = req.query;
  const expenses = await prisma.expense.findMany({
    where: {
      ...(category && { category }),
      ...((from || to) && {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    },
    orderBy: { date: 'desc' },
  });

  const filtered = month
    ? expenses.filter((e) => e.date.toISOString().slice(0, 7) === month)
    : expenses;

  res.json(filtered);
}

async function createExpense(req, res) {
  const { category, amount, date, description, billUpload } = req.body;
  if (!category || amount == null || !date || !description) {
    return res.status(400).json({ message: 'category, amount, date, description are required' });
  }

  const expense = await prisma.expense.create({
    data: { category, amount: Number(amount), date: new Date(date), description, billUpload },
  });

  await appendCashTransaction({
    date: new Date(date),
    type: 'OUT',
    amount: Number(amount),
    description: `${category} - ${description}`,
    refType: 'EXPENSE',
    refId: expense.id,
  });

  res.status(201).json(expense);
}

async function updateExpense(req, res) {
  const { category, amount, date, description, billUpload } = req.body;
  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      ...(category !== undefined && { category }),
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(description !== undefined && { description }),
      ...(billUpload !== undefined && { billUpload }),
    },
  });
  res.json(expense);
}

async function deleteExpense(req, res) {
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

module.exports = { listExpenses, createExpense, updateExpense, deleteExpense };
