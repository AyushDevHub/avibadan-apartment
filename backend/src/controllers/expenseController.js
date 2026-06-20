const prisma = require("../config/prisma");
const { appendCashTransaction } = require("./paymentController");
const { rebuildCashBalances } = require("../utils/ledger");

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
  if (!category || amount == null || !date || !description) {
    return res
      .status(400)
      .json({ message: "category, amount, date, description are required" });
  }

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
    description: `${category} - ${description}`,
    refType: "EXPENSE",
    refId: expense.id,
  });

  res.status(201).json(expense);
}

// Editing amount/date/description on a normal (cash-impacting) expense also
// updates its linked Cashbook entry and rebuilds the running balance, so the
// ledger never drifts out of sync with what you see on this page.
// Contribution-funded expenses (paidByFlatId set) have no Cashbook entry to
// begin with, so only the expense row itself is updated.
async function updateExpense(req, res) {
  const { category, amount, date, description, billUpload } = req.body;
  const existing = await prisma.expense.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Expense not found" });

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
          description: `${expense.category} - ${expense.description}`,
        },
      });
      await rebuildCashBalances();
    }
  }

  res.json(expense);
}

// Deleting an expense also deletes its linked Cashbook entry (if any) and
// rebuilds the ledger. Note: deleting a contribution-funded expense does NOT
// automatically reverse the waiver already applied to the flat's dues -
// if you need to undo that too, delete the matching ADJUSTMENT payment(s)
// on the Payments page separately.
async function deleteExpense(req, res) {
  const existing = await prisma.expense.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Expense not found" });

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
