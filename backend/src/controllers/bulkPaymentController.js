const prisma = require("../config/prisma");
const { syncBillStatuses } = require("../utils/ledger");
const { appendCashTransaction } = require("./paymentController");

function monthsBetween(from, to) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
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

async function nextIndividualReceiptNo() {
  const count = await prisma.payment.count();
  return `AV/${new Date().getFullYear()}/${String(count + 1).padStart(4, "0")}`;
}

// One consolidated GROUP receipt number shared across all months covered.
// The receipt PDF shows a breakdown table of every month covered.
async function nextGroupReceiptNo(flatNumber) {
  const count = await prisma.payment.count();
  return `AV/GRP/${flatNumber}/${new Date().getFullYear()}/${String(
    count + 1
  ).padStart(4, "0")}`;
}

async function createBulkPayment(req, res) {
  const { flatId, fromMonth, toMonth, amount, date, mode, note } = req.body;
  if (!flatId || !fromMonth || !toMonth || amount == null || !date)
    return res
      .status(400)
      .json({
        message: "flatId, fromMonth, toMonth, amount, date are required",
      });
  if (toMonth < fromMonth)
    return res
      .status(400)
      .json({ message: "toMonth must not be before fromMonth" });

  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat) return res.status(404).json({ message: "Flat not found" });

  const months = monthsBetween(fromMonth, toMonth);
  if (months.length > 120)
    return res
      .status(400)
      .json({ message: "Range too large - max 120 months (10 years) at once" });

  const paymentMode = mode || "CASH";
  let remaining = Number(amount);
  if (remaining <= 0)
    return res
      .status(400)
      .json({ message: "Amount must be greater than zero" });

  // One group receipt number for the whole range.
  const groupReceiptNo = await nextGroupReceiptNo(flat.flatNumber);
  const paymentsCreated = [];
  const monthsCovered = [];
  const breakdown = []; // for the receipt PDF

  for (const month of months) {
    if (remaining <= 0) break;

    // Ensure bill exists (lazy creation).
    let bill = await prisma.maintenanceBill.findUnique({
      where: { flatId_month: { flatId, month } },
    });
    if (!bill) {
      bill = await prisma.maintenanceBill.create({
        data: {
          flatId,
          month,
          amount: flat.monthlyRate,
          dueDate: new Date(`${month}-10`),
          status: "UNPAID",
        },
      });
    }

    const paidSoFar = await prisma.payment.aggregate({
      where: { billId: bill.id },
      _sum: { amount: true },
    });
    const billRemaining = bill.amount - (paidSoFar._sum.amount || 0);
    if (billRemaining <= 0) continue; // already fully paid

    const allocate = Math.min(billRemaining, remaining);
    const receiptNo = await nextIndividualReceiptNo();
    const payment = await prisma.payment.create({
      data: {
        flatId,
        billId: bill.id,
        amount: allocate,
        date: new Date(date),
        mode: paymentMode,
        receiptNo,
        groupReceiptNo,
        note: note || `Multi-month payment: ${fromMonth} to ${toMonth}`,
      },
    });
    paymentsCreated.push(payment);
    monthsCovered.push(month);
    breakdown.push({ month, amount: allocate });
    remaining -= allocate;

    if (paymentMode !== "ADJUSTMENT") {
      await appendCashTransaction({
        date: new Date(date),
        type: "IN",
        amount: allocate,
        description: `Maintenance ${flat.flatNumber} — ${month} (bulk ${groupReceiptNo})`,
        refType: "PAYMENT",
        refId: payment.id,
      });
    }
  }

  // Leftover beyond range → advance credit.
  if (remaining > 0) {
    const receiptNo = await nextIndividualReceiptNo();
    const payment = await prisma.payment.create({
      data: {
        flatId,
        billId: null,
        amount: remaining,
        date: new Date(date),
        mode: paymentMode,
        receiptNo,
        groupReceiptNo,
        note: `Advance credit beyond ${toMonth}`,
      },
    });
    paymentsCreated.push(payment);
    breakdown.push({ month: `Beyond ${toMonth} (advance)`, amount: remaining });
    if (paymentMode !== "ADJUSTMENT") {
      await appendCashTransaction({
        date: new Date(date),
        type: "IN",
        amount: remaining,
        description: `Maintenance ${flat.flatNumber} — advance credit (bulk ${groupReceiptNo})`,
        refType: "PAYMENT",
        refId: payment.id,
      });
    }
  }

  await syncBillStatuses(flatId);

  res
    .status(201)
    .json({ groupReceiptNo, monthsCovered, breakdown, paymentsCreated });
}

module.exports = { createBulkPayment };
