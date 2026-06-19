const prisma = require('../config/prisma');

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function duesDashboard(req, res) {
  const flats = await prisma.flat.findMany({ orderBy: { flatNumber: 'asc' } });
  const thisMonth = currentMonthStr();

  const rows = await Promise.all(
    flats.map(async (flat) => {
      const bills = await prisma.maintenanceBill.findMany({ where: { flatId: flat.id } });
      const payments = await prisma.payment.findMany({ where: { flatId: flat.id } });

      const billable = bills.filter((b) => b.status !== 'WAIVED');
      const totalBilled = billable.reduce((s, b) => s + b.amount, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

      const currentBill = bills.find((b) => b.month === thisMonth);
      const currentDue = currentBill && currentBill.status !== 'WAIVED' && currentBill.status !== 'PAID'
        ? currentBill.amount - (totalPaid > totalBilled - currentBill.amount ? totalPaid - (totalBilled - currentBill.amount) : 0)
        : 0;

      const totalDue = Math.max(totalBilled - totalPaid, 0);
      const previousDue = Math.max(totalDue - Math.max(currentDue, 0), 0);

      return {
        flatId: flat.id,
        flatNumber: flat.flatNumber,
        ownerName: flat.ownerName,
        currentMonthDue: Math.max(currentDue, 0),
        previousDue,
        totalDue,
      };
    })
  );

  const totalOutstanding = rows.reduce((s, r) => s + r.totalDue, 0);
  res.json({ totalOutstanding, flats: rows });
}

module.exports = { duesDashboard };
