const prisma = require("../config/prisma");

// Recomputes every CashTransaction's running `balance` field from scratch,
// in date order. Call this after ANY create/update/delete that touches the
// cash ledger, so the running balance never drifts out of sync.
async function rebuildCashBalances() {
  const txs = await prisma.cashTransaction.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  let balance = 0;
  for (const tx of txs) {
    balance = tx.type === "IN" ? balance + tx.amount : balance - tx.amount;
    if (balance !== tx.balance) {
      await prisma.cashTransaction.update({
        where: { id: tx.id },
        data: { balance },
      });
    }
  }
}

// Same idea, for the bank ledger.
async function rebuildBankBalances() {
  const txs = await prisma.bankTransaction.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  let balance = 0;
  for (const tx of txs) {
    balance = tx.type === "DEPOSIT" ? balance + tx.amount : balance - tx.amount;
    if (balance !== tx.balance) {
      await prisma.bankTransaction.update({
        where: { id: tx.id },
        data: { balance },
      });
    }
  }
}

// After a payment is created/edited/deleted, recompute that bill's status
// from whatever payments now actually point at it.
async function recalcBillStatus(billId) {
  if (!billId) return;
  const bill = await prisma.maintenanceBill.findUnique({
    where: { id: billId },
  });
  if (!bill || bill.status === "WAIVED") return;

  const agg = await prisma.payment.aggregate({
    where: { billId },
    _sum: { amount: true },
  });
  const totalPaid = agg._sum.amount || 0;

  let status = "UNPAID";
  if (totalPaid >= bill.amount && totalPaid > 0) status = "PAID";
  else if (totalPaid > 0) status = "PARTIAL";

  await prisma.maintenanceBill.update({
    where: { id: billId },
    data: { status },
  });
}

// Single source of truth for a flat's financial position - used everywhere
// (Residents list, Dues page, bill generation, both dashboards) so every
// screen always agrees on the same numbers.
//
// creditBalance > 0 means the flat has paid MORE than everything billed to
// date - e.g. a resident paid a large repair bill directly. That extra
// amount carries forward and auto-applies to their next bills.
async function getFlatBalance(flatId) {
  const bills = await prisma.maintenanceBill.findMany({
    where: { flatId, status: { not: "WAIVED" } },
  });
  const payments = await prisma.payment.findMany({ where: { flatId } });

  const totalBilled = bills.reduce((s, b) => s + b.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return {
    totalBilled,
    totalPaid,
    totalDue: Math.max(totalBilled - totalPaid, 0),
    creditBalance: Math.max(totalPaid - totalBilled, 0),
  };
}

function monthAdd(monthStr, n) {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(y, m - 1 + n, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function monthLabel(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

// Projects how far a flat's credit balance reaches into the future, e.g.
// "covered through March 2028, next real payment due April 2028" - used to
// show residents and admin exactly when an overpayment runs out.
async function getCreditProjection(flatId) {
  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat) return null;

  const { creditBalance } = await getFlatBalance(flatId);

  if (creditBalance <= 0 || flat.monthlyRate <= 0) {
    return {
      creditBalance,
      monthlyRate: flat.monthlyRate,
      monthsCovered: 0,
      coveredUntilMonth: null,
      coveredUntilLabel: null,
      nextPayableMonth: null,
      nextPayableLabel: null,
      remainder: creditBalance,
    };
  }

  // Start projecting from the month after the last bill ever generated for
  // this flat (or this month, if they have no bills yet).
  const lastBill = await prisma.maintenanceBill.findFirst({
    where: { flatId },
    orderBy: { month: "desc" },
  });
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const startMonth = lastBill ? monthAdd(lastBill.month, 1) : currentMonth;

  const monthsCovered = Math.floor(creditBalance / flat.monthlyRate);
  const remainder = creditBalance - monthsCovered * flat.monthlyRate;

  const coveredUntilMonth =
    monthsCovered > 0 ? monthAdd(startMonth, monthsCovered - 1) : null;
  const nextPayableMonth =
    monthsCovered > 0 ? monthAdd(startMonth, monthsCovered) : startMonth;

  return {
    creditBalance,
    monthlyRate: flat.monthlyRate,
    monthsCovered,
    coveredUntilMonth,
    coveredUntilLabel: coveredUntilMonth ? monthLabel(coveredUntilMonth) : null,
    nextPayableMonth,
    nextPayableLabel: monthLabel(nextPayableMonth),
    remainder,
  };
}

module.exports = {
  rebuildCashBalances,
  rebuildBankBalances,
  recalcBillStatus,
  getFlatBalance,
  getCreditProjection,
};
