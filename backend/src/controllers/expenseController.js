const prisma = require("../config/prisma");
const { appendCashTransaction } = require("./paymentController");
const { rebuildCashBalances } = require("../utils/ledger");

async function listExpenses(req, res) {
  const { month, category } = req.query;
  const expenses = await prisma.expense.findMany({
    where: { ...(category && { category }) },
    include: { paidByFlat: true },
    orderBy: { date: "desc" },
  });
  const filtered = month
    ? expenses.filter((e) => e.date.toISOString().slice(0, 7) === month)
    : expenses;
  res.json(filtered);
}

async function createExpense(req, res) {
  const { category, amount, date, description, billUpload } = req.body;
  if (!category || amount == null || !date || !description)
    return res
      .status(400)
      .json({ message: "category, amount, date, description are required" });

  const expense = await prisma.expense.create({
    data: {
      category,
      amount: Number(amount),
      date: new Date(date),
      description,
      billUpload,
    },
  });

  await appendCashTransaction({
    date: new Date(date),
    type: "OUT",
    amount: Number(amount),
    description: `${category.replace("_", " ")} — ${description}`,
    refType: "EXPENSE",
    refId: expense.id,
  });

  res.status(201).json(expense);
}

async function updateExpense(req, res) {
  const { category, amount, date, description, billUpload } = req.body;
  const existing = await prisma.expense.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Not found" });

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

  if (!existing.paidByFlatId) {
    const linkedTx = await prisma.cashTransaction.findFirst({
      where: { refType: "EXPENSE", refId: expense.id },
    });
    if (linkedTx) {
      await prisma.cashTransaction.update({
        where: { id: linkedTx.id },
        data: {
          date: expense.date,
          amount: expense.amount,
          description: `${expense.category.replace("_", " ")} — ${
            expense.description
          }`,
        },
      });
      await rebuildCashBalances();
    }
  }
  res.json(expense);
}

async function deleteExpense(req, res) {
  const existing = await prisma.expense.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Not found" });

  const linkedTx = await prisma.cashTransaction.findFirst({
    where: { refType: "EXPENSE", refId: existing.id },
  });

  await prisma.expense.delete({ where: { id: req.params.id } });

  if (linkedTx) {
    await prisma.cashTransaction.delete({ where: { id: linkedTx.id } });
    await rebuildCashBalances();
  }
  res.status(204).end();
}

module.exports = { listExpenses, createExpense, updateExpense, deleteExpense };
