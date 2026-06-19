const prisma = require('../config/prisma');

function monthStr(date) {
  return date.toISOString().slice(0, 7);
}

async function dashboardSummary(req, res) {
  const now = new Date();
  const thisMonth = monthStr(now);

  const [cashTx, bankTx, payments, expenses, bills, flats] = await Promise.all([
    prisma.cashTransaction.findMany({ orderBy: { date: 'asc' } }),
    prisma.bankTransaction.findMany({ orderBy: { date: 'asc' } }),
    prisma.payment.findMany(),
    prisma.expense.findMany(),
    prisma.maintenanceBill.findMany(),
    prisma.flat.findMany(),
  ]);

  const cashInHand = cashTx.length ? cashTx[cashTx.length - 1].balance : 0;
  const bankBalance = bankTx.length ? bankTx[bankTx.length - 1].balance : 0;

  const monthlyCollection = payments
    .filter((p) => monthStr(p.date) === thisMonth && p.mode !== 'ADJUSTMENT')
    .reduce((s, p) => s + p.amount, 0);

  const monthlyExpense = expenses
    .filter((e) => monthStr(e.date) === thisMonth)
    .reduce((s, e) => s + e.amount, 0);

  const pendingBills = bills.filter((b) => b.status === 'UNPAID' || b.status === 'PARTIAL').length;

  // Total outstanding due across all flats
  let totalDue = 0;
  for (const flat of flats) {
    const flatBills = bills.filter((b) => b.flatId === flat.id && b.status !== 'WAIVED');
    const flatPayments = payments.filter((p) => p.flatId === flat.id);
    const billed = flatBills.reduce((s, b) => s + b.amount, 0);
    const paid = flatPayments.reduce((s, p) => s + p.amount, 0);
    totalDue += Math.max(billed - paid, 0);
  }

  // Last 12 months income vs expense trend
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthStr(d));
  }
  const incomeVsExpense = months.map((m) => ({
    month: m,
    income: payments.filter((p) => monthStr(p.date) === m && p.mode !== 'ADJUSTMENT').reduce((s, p) => s + p.amount, 0),
    expense: expenses.filter((e) => monthStr(e.date) === m).reduce((s, e) => s + e.amount, 0),
  }));

  // Due distribution per flat
  const dueDistribution = flats.map((flat) => {
    const flatBills = bills.filter((b) => b.flatId === flat.id && b.status !== 'WAIVED');
    const flatPayments = payments.filter((p) => p.flatId === flat.id);
    const billed = flatBills.reduce((s, b) => s + b.amount, 0);
    const paid = flatPayments.reduce((s, p) => s + p.amount, 0);
    return { flatNumber: flat.flatNumber, ownerName: flat.ownerName, due: Math.max(billed - paid, 0) };
  }).filter((f) => f.due > 0);

  const recentTransactions = [...cashTx]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
    .map((t) => ({ date: t.date, type: t.type, amount: t.amount, description: t.description, balance: t.balance }));

  res.json({
    cashInHand,
    bankBalance,
    totalDue,
    monthlyCollection,
    monthlyExpense,
    pendingBills,
    incomeVsExpense,
    dueDistribution,
    recentTransactions,
  });
}

// Visible to every logged-in user (admin or resident) - this is a personal/family
// society, so cash in hand and bank balance are shown openly on every dashboard.
async function fundStatus(req, res) {
  const [cashTx, bankTx] = await Promise.all([
    prisma.cashTransaction.findFirst({ orderBy: { date: 'desc' } }),
    prisma.bankTransaction.findFirst({ orderBy: { date: 'desc' } }),
  ]);
  res.json({
    cashInHand: cashTx?.balance || 0,
    bankBalance: bankTx?.balance || 0,
  });
}

module.exports = { dashboardSummary, fundStatus };
