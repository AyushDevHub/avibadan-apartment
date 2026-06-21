const prisma = require("../config/prisma");
const { getFlatBalance, getCreditProjection } = require("../utils/ledger");

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function duesDashboard(req, res) {
  const flats = await prisma.flat.findMany({ orderBy: { flatNumber: "asc" } });
  const thisMonth = currentMonthStr();

  const rows = await Promise.all(
    flats.map(async (flat) => {
      const bills = await prisma.maintenanceBill.findMany({
        where: { flatId: flat.id },
      });
      const { totalBilled, totalPaid, totalDue, creditBalance } =
        await getFlatBalance(flat.id);

      const currentBill = bills.find((b) => b.month === thisMonth);
      const currentDue =
        currentBill &&
        currentBill.status !== "WAIVED" &&
        currentBill.status !== "PAID"
          ? currentBill.amount -
            (totalPaid > totalBilled - currentBill.amount
              ? totalPaid - (totalBilled - currentBill.amount)
              : 0)
          : 0;

      const previousDue = Math.max(totalDue - Math.max(currentDue, 0), 0);
      const creditProjection =
        creditBalance > 0 ? await getCreditProjection(flat.id) : null;

      return {
        flatId: flat.id,
        flatNumber: flat.flatNumber,
        ownerName: flat.ownerName,
        currentMonthDue: Math.max(currentDue, 0),
        previousDue,
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

module.exports = { duesDashboard };
