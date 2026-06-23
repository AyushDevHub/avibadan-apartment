const prisma = require("../config/prisma");
const { getFlatBalance, getCreditProjection } = require("../utils/ledger");

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

module.exports = { duesDashboard };
