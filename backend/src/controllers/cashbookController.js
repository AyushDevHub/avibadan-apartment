const prisma = require("../config/prisma");
const { appendCashTransaction } = require("./paymentController");
const { rebuildCashBalances } = require("../utils/ledger");

// month = 'YYYY-MM' (a specific month), year = 'YYYY' (a whole calendar year).
// If both are given, month wins. If neither, shows everything ever recorded.
async function listCashLedger(req, res) {
  const { from, to, month, year } = req.query;
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

  let filtered = transactions;
  if (month) {
    filtered = transactions.filter(
      (t) => t.date.toISOString().slice(0, 7) === month
    );
  } else if (year) {
    filtered = transactions.filter(
      (t) => String(t.date.getFullYear()) === String(year)
    );
  }

  // "Cash in Hand" is always TODAY's real balance, regardless of what
  // period you're viewing - it never changes when you filter to a past
  // month/year. "Opening" and "Closing" below are scoped to the filtered
  // period instead, so you can see what your balance was back then.
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

  // The balance at the END of the filtered period - this is the number that
  // actually matches "opening + collections - expenses" for that period.
  const closingBalance = filtered.length
    ? filtered[filtered.length - 1].balance
    : openingBalance;

  res.json({
    cashInHand,
    openingBalance,
    closingBalance,
    totalIn,
    totalOut,
    transactions: [...filtered].reverse(),
  });
}

// Returns every year that has at least one transaction, for populating a
// year picker on the Cashbook page.
async function listAvailableYears(req, res) {
  const transactions = await prisma.cashTransaction.findMany({
    select: { date: true },
  });
  const years = [
    ...new Set(transactions.map((t) => t.date.getFullYear())),
  ].sort((a, b) => b - a);
  res.json(years);
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
  listAvailableYears,
  addManualEntry,
  updateManualEntry,
  deleteManualEntry,
};
