const prisma = require("../config/prisma");

const SOCIETY_NAME = process.env.SOCIETY_NAME || "AVIBADAN APARTMENT";
const SOCIETY_ADDRESS =
  process.env.SOCIETY_ADDRESS ||
  "361/A, G.T. ROAD (S), BATAITALA BAZAR, HOWRAH - 711103";

function monthStr(date) {
  return date.toISOString().slice(0, 7);
}

async function home(req, res) {
  const [cashTx, bankTx, notices, flats] = await Promise.all([
    prisma.cashTransaction.findMany({ orderBy: { date: "desc" }, take: 1 }),
    prisma.bankTransaction.findMany({ orderBy: { date: "desc" }, take: 1 }),
    prisma.notice.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.flat.count(),
  ]);

  res.json({
    society: {
      name: SOCIETY_NAME,
      address: SOCIETY_ADDRESS,
      totalFlats: flats,
    },
    fundStatus: {
      cashInHand: cashTx[0]?.balance || 0,
      bankBalance: bankTx[0]?.balance || 0,
    },
    announcements: notices,
  });
}

async function transparency(req, res) {
  const now = new Date();
  const thisMonth = monthStr(now);

  const [cashTx, bankTx, payments, expenses] = await Promise.all([
    prisma.cashTransaction.findMany({ orderBy: { date: "asc" } }),
    prisma.bankTransaction.findMany({ orderBy: { date: "asc" } }),
    prisma.payment.findMany(),
    prisma.expense.findMany({ include: { paidByFlat: true } }),
  ]);

  const cashInHand = cashTx.length ? cashTx[cashTx.length - 1].balance : 0;
  const bankBalance = bankTx.length ? bankTx[bankTx.length - 1].balance : 0;

  const monthlyCollection = payments
    .filter((p) => monthStr(p.date) === thisMonth && p.mode !== "ADJUSTMENT")
    .reduce((s, p) => s + p.amount, 0);

  const monthlyExpenses = expenses.filter(
    (e) => monthStr(e.date) === thisMonth
  );
  const monthlyExpenseTotal = monthlyExpenses.reduce((s, e) => s + e.amount, 0);

  const expenseBreakdown = {};
  for (const e of monthlyExpenses) {
    expenseBreakdown[e.category] =
      (expenseBreakdown[e.category] || 0) + e.amount;
  }

  const majorBills = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => ({
      date: e.date,
      category: e.category,
      description: e.description,
      amount: e.amount,
      billUpload: e.billUpload,
    }));

  // Last 20 expenses, most recent first, with bill photo/PDF links where
  // attached - this is what makes spending genuinely transparent, not just
  // the headline numbers.
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20)
    .map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category,
      description: e.description,
      amount: e.amount,
      billUpload: e.billUpload,
      paidByFlat: e.paidByFlat ? e.paidByFlat.flatNumber : null,
    }));

  res.json({
    totalFund: cashInHand + bankBalance,
    cashInHand,
    bankBalance,
    monthlyCollection,
    monthlyExpense: monthlyExpenseTotal,
    expenseBreakdown,
    majorBills,
    recentExpenses,
  });
}

module.exports = { home, transparency };
