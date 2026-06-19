const prisma = require('../config/prisma');

async function listBankLedger(req, res) {
  const transactions = await prisma.bankTransaction.findMany({ orderBy: { date: 'asc' } });
  const bankBalance = transactions.length ? transactions[transactions.length - 1].balance : 0;
  res.json({ bankBalance, transactions: transactions.reverse() });
}

async function addBankTransaction(req, res) {
  const { date, type, amount, description } = req.body;
  if (!date || !type || amount == null || !description) {
    return res.status(400).json({ message: 'date, type, amount, description are required' });
  }

  const last = await prisma.bankTransaction.findFirst({ orderBy: { date: 'desc' } });
  const lastBalance = last ? last.balance : 0;
  const balance = type === 'DEPOSIT' ? lastBalance + Number(amount) : lastBalance - Number(amount);

  const tx = await prisma.bankTransaction.create({
    data: { date: new Date(date), type, amount: Number(amount), description, balance },
  });
  res.status(201).json(tx);
}

module.exports = { listBankLedger, addBankTransaction };
