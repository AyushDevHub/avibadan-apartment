const prisma = require("../config/prisma");
const { appendCashTransaction } = require("./paymentController");
const { rebuildCashBalances } = require("../utils/ledger");

async function listCashLedger(req, res) {
  const { month, year } = req.query;

  // Always fetch ALL transactions for correct running balance
  const allTransactions = await prisma.cashTransaction.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  // Filter for display only - balance numbers are from the full ledger
  let filtered = allTransactions;
  if (month) {
    filtered = allTransactions.filter(
      (t) => t.date.toISOString().slice(0, 7) === month
    );
  } else if (year) {
    filtered = allTransactions.filter(
      (t) => String(t.date.getFullYear()) === String(year)
    );
  }

  const cashInHand = allTransactions.length
    ? allTransactions[allTransactions.length - 1].balance
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

  const closingBalance = filtered.length
    ? filtered[filtered.length - 1].balance
    : openingBalance;

  // Oldest at top, newest at bottom - natural register order
  res.json({
    cashInHand,
    openingBalance,
    closingBalance,
    totalIn,
    totalOut,
    transactions: filtered,
  });
}

async function listAvailableYears(req, res) {
  const transactions = await prisma.cashTransaction.findMany({
    select: { date: true },
  });
  const years = [
    ...new Set(transactions.map((t) => t.date.getFullYear())),
  ].sort((a, b) => a - b);
  res.json(years);
}

async function addManualEntry(req, res) {
  const { date, type, amount, description } = req.body;
  if (!date || !type || amount == null || !description)
    return res
      .status(400)
      .json({ message: "date, type, amount, description are required" });

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

async function updateManualEntry(req, res) {
  const existing = await prisma.cashTransaction.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Entry not found" });
  if (existing.refType !== "MANUAL")
    return res
      .status(400)
      .json({ message: "Only manual entries can be edited here." });

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
  if (existing.refType !== "MANUAL")
    return res
      .status(400)
      .json({ message: "Only manual entries can be deleted here." });

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
