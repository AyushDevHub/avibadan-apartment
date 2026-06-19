const prisma = require('../config/prisma');

function monthStr(date) {
  return date.toISOString().slice(0, 7);
}

async function monthlyReport(req, res) {
  const { month } = req.query; // YYYY-MM
  if (!month) return res.status(400).json({ message: 'month is required (YYYY-MM)' });

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({ where: {}, include: { flat: true } }),
    prisma.expense.findMany(),
  ]);

  const monthPayments = payments.filter((p) => monthStr(p.date) === month && p.mode !== 'ADJUSTMENT');
  const monthExpenses = expenses.filter((e) => monthStr(e.date) === month);

  const collection = monthPayments.reduce((s, p) => s + p.amount, 0);
  const expenseTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const expenseByCategory = {};
  for (const e of monthExpenses) {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  }

  res.json({
    month,
    collection,
    expenseTotal,
    balance: collection - expenseTotal,
    payments: monthPayments.map((p) => ({
      date: p.date,
      flat: p.flat.flatNumber,
      owner: p.flat.ownerName,
      amount: p.amount,
      mode: p.mode,
      receiptNo: p.receiptNo,
    })),
    expenses: monthExpenses,
    expenseByCategory,
  });
}

async function annualReport(req, res) {
  const { year } = req.query; // YYYY
  if (!year) return res.status(400).json({ message: 'year is required (YYYY)' });

  const [payments, expenses, bills] = await Promise.all([
    prisma.payment.findMany({ include: { flat: true } }),
    prisma.expense.findMany(),
    prisma.maintenanceBill.findMany(),
  ]);

  const yearPayments = payments.filter((p) => p.date.getFullYear() === Number(year) && p.mode !== 'ADJUSTMENT');
  const yearExpenses = expenses.filter((e) => e.date.getFullYear() === Number(year));
  const yearBills = bills.filter((b) => b.month.startsWith(year) && b.status !== 'WAIVED');

  const totalCollection = yearPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = yearExpenses.reduce((s, e) => s + e.amount, 0);
  const totalBilled = yearBills.reduce((s, b) => s + b.amount, 0);
  const pendingDues = Math.max(totalBilled - totalCollection, 0);

  const monthly = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    monthly.push({
      month: key,
      collection: yearPayments.filter((p) => monthStr(p.date) === key).reduce((s, p) => s + p.amount, 0),
      expense: yearExpenses.filter((e) => monthStr(e.date) === key).reduce((s, e) => s + e.amount, 0),
    });
  }

  res.json({
    year,
    totalCollection,
    totalExpenses,
    pendingDues,
    netBalance: totalCollection - totalExpenses,
    monthly,
  });
}

function toCsv(rows, headers) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

async function exportMonthlyCsv(req, res) {
  const { month } = req.query;
  if (!month) return res.status(400).json({ message: 'month is required (YYYY-MM)' });

  const payments = await prisma.payment.findMany({ include: { flat: true } });
  const monthPayments = payments.filter((p) => monthStr(p.date) === month);

  const rows = monthPayments.map((p) => ({
    date: p.date.toISOString().slice(0, 10),
    flat: p.flat.flatNumber,
    owner: p.flat.ownerName,
    amount: p.amount,
    mode: p.mode,
    receiptNo: p.receiptNo,
  }));

  const csv = toCsv(rows, ['date', 'flat', 'owner', 'amount', 'mode', 'receiptNo']);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="collections-${month}.csv"`);
  res.send(csv);
}

module.exports = { monthlyReport, annualReport, exportMonthlyCsv };
