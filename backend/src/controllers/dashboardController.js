const prisma = require("../config/prisma");
const { getFlatBalance } = require("../utils/ledger");

function monthStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function dashboardSummary(req, res) {
  const now = new Date();
  const thisMonth = monthStr(now);

  const [cashTx, bankTx, payments, expenses, flats] = await Promise.all([
    prisma.cashTransaction.findMany({ orderBy: { date: "desc" }, take: 1 }),
    prisma.bankTransaction.findMany({ orderBy: { date: "desc" }, take: 1 }),
    prisma.payment.findMany({ include: { flat: true } }),
    prisma.expense.findMany({ orderBy: { date: "desc" } }),
    prisma.flat.findMany(),
  ]);

  const cashInHand = cashTx[0]?.balance || 0;
  const bankBalance = bankTx[0]?.balance || 0;

  // Monthly collection = actual cash received this month (not adjustments)
  const monthlyCollection = payments
    .filter((p) => monthStr(p.date) === thisMonth && p.mode !== "ADJUSTMENT")
    .reduce((s, p) => s + p.amount, 0);

  const monthlyExpense = expenses
    .filter((e) => monthStr(e.date) === thisMonth)
    .reduce((s, e) => s + e.amount, 0);

  // Total dues - rate-based
  let totalDue = 0;
  for (const flat of flats) {
    const { totalDue: due } = await getFlatBalance(flat.id);
    totalDue += due;
  }

  // Income vs expense chart - last 12 months
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthStr(d));
  }
  const allPayments = await prisma.payment.findMany();
  const allExpenses = await prisma.expense.findMany();

  const incomeVsExpense = months.map((m) => ({
    month: m,
    income: allPayments
      .filter((p) => monthStr(p.date) === m && p.mode !== "ADJUSTMENT")
      .reduce((s, p) => s + p.amount, 0),
    expense: allExpenses
      .filter((e) => monthStr(e.date) === m)
      .reduce((s, e) => s + e.amount, 0),
  }));

  // Activity feed - last 20 items across payments, expenses, bills (sorted by date desc)
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
  const recentBills = await prisma.maintenanceBill.findMany({
    include: { flat: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

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
    ...recentBills.map((b) => ({
      type: "BILL",
      date: b.dueDate,
      createdAt: b.createdAt,
      label: `${b.flat.flatNumber} — ₹${b.amount.toLocaleString(
        "en-IN"
      )} bill for ${b.month}`,
      sub: b.status,
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
  const [cashTx, bankTx] = await Promise.all([
    prisma.cashTransaction.findFirst({ orderBy: { date: "desc" } }),
    prisma.bankTransaction.findFirst({ orderBy: { date: "desc" } }),
  ]);
  res.json({
    cashInHand: cashTx?.balance || 0,
    bankBalance: bankTx?.balance || 0,
  });
}

module.exports = { dashboardSummary, fundStatus };
