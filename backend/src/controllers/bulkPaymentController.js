const prisma = require("../config/prisma");
const { recalcBillStatus } = require("../utils/ledger");
const { appendCashTransaction } = require("./paymentController");

async function nextReceiptNumber() {
  const count = await prisma.payment.count();
  const year = new Date().getFullYear();
  return `AV/${year}/${String(count + 1).padStart(4, "0")}`;
}

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

// Records one payment that covers MULTIPLE months at once - e.g. a resident
// pays a full year, or even several years, in a single visit.
//
// For each month in the range: uses the bill if it already exists, or
// creates it (at the flat's current rate) if it doesn't - so this works
// equally well for prepaying the future or backfilling missed past months.
// The amount is applied oldest-month-first. Each month gets its own
// Payment record (so each has its own receipt and the bill list stays
// accurate), but each is still posted to the Cashbook exactly like a normal
// payment - fully symmetric with edit/delete on the Payments page.
//
// Any leftover beyond the requested range becomes an advance credit (same
// mechanism as Resident Contribution) and will auto-apply to bills
// generated later, beyond toMonth.
async function createBulkPayment(req, res) {
  const { flatId, fromMonth, toMonth, amount, date, mode, note } = req.body;
  if (!flatId || !fromMonth || !toMonth || amount == null || !date) {
    return res
      .status(400)
      .json({
        message: "flatId, fromMonth, toMonth, amount, date are required",
      });
  }
  if (toMonth < fromMonth) {
    return res
      .status(400)
      .json({ message: "toMonth must not be before fromMonth" });
  }

  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat) return res.status(404).json({ message: "Flat not found" });

  const months = monthsBetween(fromMonth, toMonth);
  if (months.length > 60) {
    return res
      .status(400)
      .json({ message: "Range too large - max 60 months (5 years) at once" });
  }

  let remaining = Number(amount);
  if (remaining <= 0)
    return res
      .status(400)
      .json({ message: "Amount must be greater than zero" });

  const paymentMode = mode || "CASH";
  const paymentsCreated = [];
  const monthsCovered = [];

  for (const month of months) {
    if (remaining <= 0) break;

    let bill = await prisma.maintenanceBill.findUnique({
      where: { flatId_month: { flatId, month } },
    });
    if (!bill) {
      bill = await prisma.maintenanceBill.create({
        data: {
          flatId,
          month,
          amount: flat.monthlyRate,
          dueDate: new Date(date),
          status: "UNPAID",
        },
      });
    }
    if (bill.status === "WAIVED" || bill.status === "PAID") continue;

    const paidSoFar = await prisma.payment.aggregate({
      where: { billId: bill.id },
      _sum: { amount: true },
    });
    const billRemaining = bill.amount - (paidSoFar._sum.amount || 0);
    if (billRemaining <= 0) continue;

    const allocate = Math.min(billRemaining, remaining);
    const receiptNo = await nextReceiptNumber();
    const payment = await prisma.payment.create({
      data: {
        flatId,
        billId: bill.id,
        amount: allocate,
        date: new Date(date),
        mode: paymentMode,
        receiptNo,
        note: note || `Multi-month payment covering ${fromMonth} to ${toMonth}`,
      },
    });
    paymentsCreated.push(payment);
    monthsCovered.push(month);
    await recalcBillStatus(bill.id);
    remaining -= allocate;

    if (paymentMode !== "ADJUSTMENT") {
      await appendCashTransaction({
        date: new Date(date),
        type: "IN",
        amount: allocate,
        description: `Maintenance - ${flat.flatNumber} (${month}) - multi-month payment (${receiptNo})`,
        refType: "PAYMENT",
        refId: payment.id,
      });
    }
  }

  // Leftover beyond the requested range - carried forward as credit.
  if (remaining > 0) {
    const receiptNo = await nextReceiptNumber();
    const payment = await prisma.payment.create({
      data: {
        flatId,
        billId: null,
        amount: remaining,
        date: new Date(date),
        mode: paymentMode,
        receiptNo,
        note: `Advance credit beyond ${toMonth}`,
      },
    });
    paymentsCreated.push(payment);

    if (paymentMode !== "ADJUSTMENT") {
      await appendCashTransaction({
        date: new Date(date),
        type: "IN",
        amount: remaining,
        description: `Maintenance - ${flat.flatNumber} - advance credit beyond ${toMonth} (${receiptNo})`,
        refType: "PAYMENT",
        refId: payment.id,
      });
    }
  }

  res.status(201).json({ monthsCovered, paymentsCreated });
}

module.exports = { createBulkPayment };
