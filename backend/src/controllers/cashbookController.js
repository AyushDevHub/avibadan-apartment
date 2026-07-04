const prisma = require("../config/prisma");
const { rebuildCashBalances } = require("../utils/ledger");

async function appendCashTransaction({
  date,
  type,
  amount,
  description,
  refType,
  refId,
}) {
  const last = await prisma.cashTransaction.findFirst({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const lastBalance = last ? last.balance : 0;
  const balance = type === "IN" ? lastBalance + amount : lastBalance - amount;
  return prisma.cashTransaction.create({
    data: {
      date,
      type,
      amount,
      balance,
      description,
      refType: refType || "MANUAL",
      refId: refId || null,
    },
  });
}

async function listCashLedger(req, res) {
  const { month, year, from, to } = req.query;

  // Always fetch ALL for correct running balance
  const all = await prisma.cashTransaction.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  let filtered = all;
  if (month) {
    filtered = all.filter((t) => t.date.toISOString().slice(0, 7) === month);
  } else if (year) {
    filtered = all.filter((t) => String(t.date.getFullYear()) === String(year));
  } else if (from && to) {
    filtered = all.filter((t) => {
      const d = t.date.toISOString().slice(0, 10);
      return d >= from && d <= to;
    });
  }

  const cashInHand = all.length ? all[all.length - 1].balance : 0;
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

  // Newest at top for display
  res.json({
    cashInHand,
    openingBalance,
    closingBalance,
    totalIn,
    totalOut,
    transactions: [...filtered].reverse(),
  });
}

async function listAvailableYears(req, res) {
  const txs = await prisma.cashTransaction.findMany({ select: { date: true } });
  const years = [...new Set(txs.map((t) => t.date.getFullYear()))].sort(
    (a, b) => b - a
  );
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
  });
  res.status(201).json(tx);
}

async function updateManualEntry(req, res) {
  const existing = await prisma.cashTransaction.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Not found" });
  if (existing.refType !== "MANUAL")
    return res
      .status(400)
      .json({ message: "Only manual entries can be edited here." });
  const { date, type, amount, description } = req.body;
  await prisma.cashTransaction.update({
    where: { id: req.params.id },
    data: {
      ...(date && { date: new Date(date) }),
      ...(type && { type }),
      ...(amount != null && { amount: Number(amount) }),
      ...(description && { description }),
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
  if (!existing) return res.status(404).json({ message: "Not found" });
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
  appendCashTransaction,
};
