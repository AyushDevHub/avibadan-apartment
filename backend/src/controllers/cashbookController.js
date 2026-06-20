const prisma = require("../config/prisma");
const { appendCashTransaction } = require("./paymentController");
const { rebuildCashBalances } = require("../utils/ledger");

async function listCashLedger(req, res) {
  const { from, to, month } = req.query;
  const transactions = await prisma.cashTransaction.findMany({
    where: {
      ...((from || to) && {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    },
    orderBy: { date: "asc" },
  });

  const filtered = month
    ? transactions.filter((t) => t.date.toISOString().slice(0, 7) === month)
    : transactions;

  const cashInHand = transactions.length
    ? transactions[transactions.length - 1].balance
    : 0;
  const totalIn = filtered
    .filter((t) => t.type === "IN")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered
    .filter((t) => t.type === "OUT")
    .reduce((s, t) => s + t.amount, 0);
  const openingBalance = filtered.length
    ? filtered[0].balance -
      (filtered[0].type === "IN" ? filtered[0].amount : -filtered[0].amount)
    : cashInHand;

  res.json({
    cashInHand,
    openingBalance,
    totalIn,
    totalOut,
    transactions: filtered.reverse(),
  });
}

// Manual entry, e.g. your opening balance, or a stray cash adjustment that
// doesn't belong to a specific Payment or Expense.
async function addManualEntry(req, res) {
  const { date, type, amount, description } = req.body;
  if (!date || !type || amount == null || !description) {
    return res
      .status(400)
      .json({ message: "date, type, amount, description are required" });
  }
  const tx = await appendCashTransaction({
    date: new Date(date),
    type,
    amount: Number(amount),
    description,
    refType: "MANUAL",
    refId: null,
  });
  res.status(201).json(tx);
}

// Only MANUAL entries can be edited/deleted directly here. Entries created
// by a Payment or Expense are edited by editing that Payment/Expense instead
// - that keeps the ledger from silently drifting out of sync with its source.
async function updateManualEntry(req, res) {
  const existing = await prisma.cashTransaction.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Entry not found" });
  if (existing.refType !== "MANUAL") {
    return res.status(400).json({
      message:
        "This entry was created by a Payment or Expense. Edit it from the Payments or Expenses page instead.",
    });
  }

  const { date, type, amount, description } = req.body;
  await prisma.cashTransaction.update({
    where: { id: req.params.id },
    data: {
      ...(date !== undefined && { date: new Date(date) }),
      ...(type !== undefined && { type }),
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(description !== undefined && { description }),
    },
  });

  await rebuildCashBalances();
  const updated = await prisma.cashTransaction.findUnique({
    where: { id: req.params.id },
  });
  res.json(updated);
}

async function deleteManualEntry(req, res) {
  const existing = await prisma.cashTransaction.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Entry not found" });
  if (existing.refType !== "MANUAL") {
    return res.status(400).json({
      message:
        "This entry was created by a Payment or Expense. Delete it from the Payments or Expenses page instead.",
    });
  }

  await prisma.cashTransaction.delete({ where: { id: req.params.id } });
  await rebuildCashBalances();
  res.status(204).end();
}

module.exports = {
  listCashLedger,
  addManualEntry,
  updateManualEntry,
  deleteManualEntry,
};
