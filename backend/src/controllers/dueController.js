const prisma = require("../config/prisma");
const {
  getFlatBalance,
  getCreditProjection,
  syncBillStatuses,
  monthRange,
  monthStr,
  currentMonthStr,
} = require("../utils/ledger");

async function duesDashboard(req, res) {
  const flats = await prisma.flat.findMany({ orderBy: { flatNumber: "asc" } });

  const rows = await Promise.all(
    flats.map(async (flat) => {
      const { totalDue, creditBalance } = await getFlatBalance(flat.id);
      const creditProjection =
        creditBalance > 0 ? await getCreditProjection(flat.id) : null;
      return {
        flatId: flat.id,
        flatNumber: flat.flatNumber,
        ownerName: flat.ownerName,
        monthlyRate: flat.monthlyRate,
        totalDue,
        creditBalance,
        creditProjection,
      };
    })
  );

  const totalOutstanding = rows.reduce((s, r) => s + r.totalDue, 0);
  const totalCredit = rows.reduce((s, r) => s + r.creditBalance, 0);
  res.json({ totalOutstanding, totalCredit, flats: rows });
}

// ─── AT-A-GLANCE PAYMENT MATRIX ─────────────────────────────────────────────
// One place to see, per flat, per month: PAID / PARTIAL / UNPAID / WAIVED /
// N/A (before that flat existed). Everyone's status for the recent months,
// side by side, instead of digging through each resident's ledger one at a
// time.
async function duesMatrix(req, res) {
  const months = Math.min(24, Math.max(1, Number(req.query.months) || 6));

  const flats = await prisma.flat.findMany({
    where: { status: "ACTIVE" },
    orderBy: { flatNumber: "asc" },
  });

  const nowMonth = currentMonthStr();
  const [ny, nm] = nowMonth.split("-").map(Number);
  const startIndex = ny * 12 + (nm - 1) - (months - 1);
  const startYear = Math.floor(startIndex / 12);
  const startMonthNum = (startIndex % 12) + 1;
  const windowStart = `${startYear}-${String(startMonthNum).padStart(2, "0")}`;
  const columns = monthRange(windowStart, nowMonth);

  const rows = await Promise.all(
    flats.map(async (flat) => {
      // Keeps bills (and their PAID/PARTIAL/UNPAID status) in sync with
      // actual payments, same as the Maintenance Bills page does — so the
      // matrix is always accurate without needing "Generate" clicked first.
      await syncBillStatuses(flat.id);

      const bills = await prisma.maintenanceBill.findMany({
        where: { flatId: flat.id, month: { in: columns } },
      });
      const byMonth = new Map(bills.map((b) => [b.month, b]));

      const flatStart = flat.maintenanceStartMonth || monthStr(flat.createdAt);

      const cells = columns.map((month) => {
        if (month < flatStart) {
          return { month, status: "N/A", amount: 0 };
        }
        const bill = byMonth.get(month);
        return {
          month,
          status: bill ? bill.status : "UNPAID",
          amount: bill ? bill.amount : flat.monthlyRate,
        };
      });

      const unpaidCount = cells.filter(
        (c) => c.status === "UNPAID" || c.status === "PARTIAL"
      ).length;

      return {
        flatId: flat.id,
        flatNumber: flat.flatNumber,
        ownerName: flat.ownerName,
        cells,
        unpaidCount,
      };
    })
  );

  res.json({ columns, flats: rows });
}

module.exports = { duesDashboard, duesMatrix };
