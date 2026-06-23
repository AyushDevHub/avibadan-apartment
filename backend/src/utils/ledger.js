const prisma = require("../config/prisma");

function monthStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthStr() {
  return monthStr(new Date());
}

// Returns how many months are in [fromMonth, toMonth] inclusive.
function countMonths(fromMonth, toMonth) {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  return Math.max(0, ty * 12 + tm - (fy * 12 + fm) + 1);
}

// Returns an array of YYYY-MM strings from fromMonth to toMonth inclusive.
function monthRange(fromMonth, toMonth) {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  const months = [];
  let y = fy,
    m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

// Returns the default start month for a flat — the month it was created.
function flatCreationMonth(flat) {
  return monthStr(flat.createdAt);
}

// ─── CORE BALANCE CALCULATION ────────────────────────────────────────────────
//
// The OLD system was bill-centric: dues only existed when you clicked
// "Generate". This caused every bug the user reported.
//
// The NEW system is RATE-BASED:
//   totalExpected = months from flat.maintenanceStartMonth to TODAY × rate
//   totalPaid     = ALL payments for this flat (cash + adjustment/contribution)
//   totalDue      = max(totalExpected − totalPaid, 0)
//   creditBalance = max(totalPaid − totalExpected, 0)
//
// Bills are still created as display/notification records, but they are NOT
// the source of financial truth. You never need to click "Generate" for the
// balances to be correct.
//
// For point 4/5 (someone contributing expenses):
//   Contribution payments use mode=ADJUSTMENT and are included in totalPaid.
//   So if Ukil contributes ₹10,000 and owes ₹2,844 for the year, totalPaid
//   includes the ₹10,000, creditBalance = ₹10,000 − ₹2,844 = ₹7,156.
//   That credit carries forward and reduces future totalExpected automatically.
async function getFlatBalance(flatId) {
  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat)
    return {
      totalExpected: 0,
      totalPaid: 0,
      totalDue: 0,
      creditBalance: 0,
      creditMonthsCovered: 0,
      paidThroughMonth: null,
    };

  const startMonth = flat.maintenanceStartMonth || flatCreationMonth(flat);
  const nowMonth = currentMonthStr();

  // Only calculate up to current month (never charge for future months).
  const numMonths =
    startMonth > nowMonth ? 0 : countMonths(startMonth, nowMonth);
  const totalExpected = numMonths * flat.monthlyRate;

  const agg = await prisma.payment.aggregate({
    where: { flatId },
    _sum: { amount: true },
  });
  const totalPaid = agg._sum.amount || 0;

  const totalDue = Math.max(totalExpected - totalPaid, 0);
  const creditBalance = Math.max(totalPaid - totalExpected, 0);

  // How many future months does the credit cover?
  let creditMonthsCovered = 0;
  let paidThroughMonth = null;
  if (creditBalance > 0 && flat.monthlyRate > 0) {
    creditMonthsCovered = Math.floor(creditBalance / flat.monthlyRate);
    if (creditMonthsCovered > 0) {
      const [ny, nm] = nowMonth.split("-").map(Number);
      const throughIndex = ny * 12 + (nm - 1) + creditMonthsCovered;
      const ty = Math.floor(throughIndex / 12);
      const tm = (throughIndex % 12) + 1;
      const MONTHS = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      paidThroughMonth = `${MONTHS[tm - 1]} ${ty}`;
    }
  }

  return {
    totalExpected,
    totalPaid,
    totalDue,
    creditBalance,
    creditMonthsCovered,
    paidThroughMonth,
  };
}

// ─── BILL SYNC ────────────────────────────────────────────────────────────────
// Creates any missing MaintenanceBill records for a flat between its start
// month and today. This is called lazily (on demand) so the bill list is
// always complete for display, without requiring a manual "Generate" click.
// Already-existing bills (any status) are never modified.
async function ensureBillsUpToDate(flatId) {
  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat) return;

  const startMonth = flat.maintenanceStartMonth || flatCreationMonth(flat);
  const nowMonth = currentMonthStr();
  if (startMonth > nowMonth) return;

  const existing = await prisma.maintenanceBill.findMany({
    where: { flatId },
    select: { month: true },
  });
  const existingSet = new Set(existing.map((b) => b.month));

  const months = monthRange(startMonth, nowMonth);
  for (const month of months) {
    if (existingSet.has(month)) continue;
    await prisma.maintenanceBill.create({
      data: {
        flatId,
        month,
        amount: flat.monthlyRate,
        dueDate: new Date(`${month}-10`), // default 10th of the month
        status: "UNPAID",
      },
    });
  }
}

// Sync all bills for a flat and then update each bill's status to match the
// actual payment total — so the bill list is always visually accurate.
async function syncBillStatuses(flatId) {
  await ensureBillsUpToDate(flatId);

  const bills = await prisma.maintenanceBill.findMany({
    where: { flatId, status: { not: "WAIVED" } },
    orderBy: { month: "asc" },
  });

  const allPayments = await prisma.payment.findMany({
    where: { flatId },
    orderBy: { date: "asc" },
  });

  // Apply payments oldest-first across bills (FIFO), same as a real register.
  let remaining = allPayments.reduce((s, p) => s + p.amount, 0);
  for (const bill of bills) {
    let status;
    if (remaining >= bill.amount) {
      status = "PAID";
      remaining -= bill.amount;
    } else if (remaining > 0) {
      status = "PARTIAL";
      remaining = 0;
    } else {
      status = "UNPAID";
    }
    if (bill.status !== status) {
      await prisma.maintenanceBill.update({
        where: { id: bill.id },
        data: { status },
      });
    }
  }
}

// ─── CASH LEDGER REBUILD ──────────────────────────────────────────────────────
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

// Kept for compatibility — bill status is now always derived from syncBillStatuses.
async function recalcBillStatus(billId) {
  if (!billId) return;
  const bill = await prisma.maintenanceBill.findUnique({
    where: { id: billId },
  });
  if (!bill || bill.status === "WAIVED") return;
  await syncBillStatuses(bill.flatId);
}

// Credit projection for display
async function getCreditProjection(flatId) {
  const { creditBalance, creditMonthsCovered, paidThroughMonth } =
    await getFlatBalance(flatId);
  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat || creditBalance <= 0)
    return {
      monthsCovered: 0,
      coveredUntilLabel: null,
      nextPayableLabel: null,
    };

  const nowMonth = currentMonthStr();
  const [ny, nm] = nowMonth.split("-").map(Number);
  const nextIndex = ny * 12 + (nm - 1) + creditMonthsCovered + 1;
  const nextY = Math.floor(nextIndex / 12);
  const nextM = (nextIndex % 12) + 1;
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const nextPayableLabel = `${MONTHS[nextM - 1]} ${nextY}`;

  return {
    monthsCovered: creditMonthsCovered,
    coveredUntilLabel: paidThroughMonth,
    nextPayableLabel,
  };
}

module.exports = {
  getFlatBalance,
  ensureBillsUpToDate,
  syncBillStatuses,
  recalcBillStatus,
  rebuildCashBalances,
  rebuildBankBalances,
  getCreditProjection,
  monthRange,
  currentMonthStr,
  monthStr,
};
