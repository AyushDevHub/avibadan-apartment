const prisma = require("../config/prisma");
const { getFlatBalance } = require("../utils/ledger");

function monthStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function dashboardSummary(req, res) {
  const now = new Date();
  const thisMonth = monthStr(now);

  // Cash in hand = last CashTransaction balance (EXACT SAME as cashbook page)
  const lastCashTx = await prisma.cashTransaction.findFirst({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const cashInHand = lastCashTx?.balance || 0;

  // Bank balance
  const lastBankTx = await prisma.bankTransaction.findFirst({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const bankBalance = lastBankTx?.balance || 0;

  // This month collection = cash payments received this month
  const allPayments = await prisma.payment.findMany({
    include: { flat: true },
  });
  const monthlyCollection = allPayments
    .filter((p) => monthStr(p.date) === thisMonth && p.mode !== "ADJUSTMENT")
    .reduce((s, p) => s + p.amount, 0);

  // This month expense
  const allExpenses = await prisma.expense.findMany();
  const monthlyExpense = allExpenses
    .filter((e) => monthStr(e.date) === thisMonth)
    .reduce((s, e) => s + e.amount, 0);

  // Total dues across all flats (rate-based)
  const flats = await prisma.flat.findMany();
  let totalDue = 0;
  for (const flat of flats) {
    const { totalDue: due } = await getFlatBalance(flat.id);
    totalDue += due;
  }

  // 12-month income vs expense chart
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthStr(d));
  }
  const incomeVsExpense = months.map((m) => ({
    month: m,
    income: allPayments
      .filter((p) => monthStr(p.date) === m && p.mode !== "ADJUSTMENT")
      .reduce((s, p) => s + p.amount, 0),
    expense: allExpenses
      .filter((e) => monthStr(e.date) === m)
      .reduce((s, e) => s + e.amount, 0),
  }));

  // Recent activity feed
  const recentPayments = await prisma.payment.findMany({
    include: { flat: true, bill: true },
    orderBy: { date: "desc" },
    take: 10,
  });
  const recentExpenses = await prisma.expense.findMany({
    include: { paidByFlat: true },
    orderBy: { date: "desc" },
    take: 10,
  });

  const API = process.env.VITE_API_URL || "";
  const activity = [
    ...recentPayments.map((p) => ({
      type: "PAYMENT",
      date: p.date,
      createdAt: p.createdAt,
      label: `${p.flat.flatNumber} — ₹${p.amount.toLocaleString("en-IN")} (${
        p.mode
      })`,
      sub: p.note || (p.bill ? `for ${p.bill.month}` : ""),
      receiptId: p.id,
    })),
    ...recentExpenses.map((e) => ({
      type: "EXPENSE",
      date: e.date,
      createdAt: e.createdAt,
      label: `${e.category.replace("_", " ")} — ₹${e.amount.toLocaleString(
        "en-IN"
      )}`,
      sub:
        e.description +
        (e.paidByFlat ? ` (${e.paidByFlat.flatNumber} contributed)` : ""),
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  res.json({
    cashInHand,
    bankBalance,
    totalDue,
    monthlyCollection,
    monthlyExpense,
    incomeVsExpense,
    activity,
  });
}

async function fundStatus(req, res) {
  // Same source — guaranteed match with cashbook
  const lastCashTx = await prisma.cashTransaction.findFirst({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const lastBankTx = await prisma.bankTransaction.findFirst({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  res.json({
    cashInHand: lastCashTx?.balance || 0,
    bankBalance: lastBankTx?.balance || 0,
  });
}

module.exports = { dashboardSummary, fundStatus };
