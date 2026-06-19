const prisma = require('../config/prisma');
const { appendCashTransaction } = require('./paymentController');

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
    orderBy: { date: 'asc' },
  });

  const filtered = month
    ? transactions.filter((t) => t.date.toISOString().slice(0, 7) === month)
    : transactions;

  const cashInHand = transactions.length ? transactions[transactions.length - 1].balance : 0;
  const totalIn = filtered.filter((t) => t.type === 'IN').reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.type === 'OUT').reduce((s, t) => s + t.amount, 0);
  const openingBalance = filtered.length
    ? filtered[0].balance - (filtered[0].type === 'IN' ? filtered[0].amount : -filtered[0].amount)
    : cashInHand;

  res.json({ cashInHand, openingBalance, totalIn, totalOut, transactions: filtered.reverse() });
}

// Manual entry, e.g. correcting an opening balance or recording a misc cash movement
async function addManualEntry(req, res) {
  const { date, type, amount, description } = req.body;
  if (!date || !type || amount == null || !description) {
    return res.status(400).json({ message: 'date, type, amount, description are required' });
  }
  const tx = await appendCashTransaction({
    date: new Date(date),
    type,
    amount: Number(amount),
    description,
    refType: 'MANUAL',
    refId: null,
  });
  res.status(201).json(tx);
}

module.exports = { listCashLedger, addManualEntry };
