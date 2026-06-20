const prisma = require("../config/prisma");
const { rebuildBankBalances } = require("../utils/ledger");

async function listBankLedger(req, res) {
  const transactions = await prisma.bankTransaction.findMany({
    orderBy: { date: "asc" },
  });
  const bankBalance = transactions.length
    ? transactions[transactions.length - 1].balance
    : 0;
  res.json({ bankBalance, transactions: [...transactions].reverse() });
}

async function addBankTransaction(req, res) {
  const { date, type, amount, description } = req.body;
  if (!date || !type || amount == null || !description) {
    return res
      .status(400)
      .json({ message: "date, type, amount, description are required" });
  }

  const last = await prisma.bankTransaction.findFirst({
    orderBy: { date: "desc" },
  });
  const lastBalance = last ? last.balance : 0;
  const balance =
    type === "DEPOSIT"
      ? lastBalance + Number(amount)
      : lastBalance - Number(amount);

  const tx = await prisma.bankTransaction.create({
    data: {
      date: new Date(date),
      type,
      amount: Number(amount),
      description,
      balance,
    },
  });
  res.status(201).json(tx);
}

async function updateBankTransaction(req, res) {
  const existing = await prisma.bankTransaction.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Entry not found" });

  const { date, type, amount, description } = req.body;
  await prisma.bankTransaction.update({
    where: { id: req.params.id },
    data: {
      ...(date !== undefined && { date: new Date(date) }),
      ...(type !== undefined && { type }),
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(description !== undefined && { description }),
    },
  });

  await rebuildBankBalances();
  const updated = await prisma.bankTransaction.findUnique({
    where: { id: req.params.id },
  });
  res.json(updated);
}

async function deleteBankTransaction(req, res) {
  const existing = await prisma.bankTransaction.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Entry not found" });

  await prisma.bankTransaction.delete({ where: { id: req.params.id } });
  await rebuildBankBalances();
  res.status(204).end();
}

module.exports = {
  listBankLedger,
  addBankTransaction,
  updateBankTransaction,
  deleteBankTransaction,
};
