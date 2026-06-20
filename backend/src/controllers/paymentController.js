const prisma = require("../config/prisma");
const { rebuildCashBalances, recalcBillStatus } = require("../utils/ledger");

async function nextReceiptNumber() {
  const count = await prisma.payment.count();
  const year = new Date().getFullYear();
  return `AV/${year}/${String(count + 1).padStart(4, "0")}`;
}

async function appendCashTransaction({
  date,
  type,
  amount,
  description,
  refType,
  refId,
}) {
  const last = await prisma.cashTransaction.findFirst({
    orderBy: { date: "desc" },
  });
  const lastBalance = last ? last.balance : 0;
  const balance = type === "IN" ? lastBalance + amount : lastBalance - amount;
  return prisma.cashTransaction.create({
    data: { date, type, amount, balance, description, refType, refId },
  });
}

async function listPayments(req, res) {
  const { flatId, mode, from, to } = req.query;
  const payments = await prisma.payment.findMany({
    where: {
      ...(flatId && { flatId }),
      ...(mode && { mode }),
      ...((from || to) && {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    },
    include: { flat: true, bill: true },
    orderBy: { date: "desc" },
  });
  res.json(payments);
}

// Receive a payment from a flat. If mode === ADJUSTMENT, no cash actually moves
// (e.g. a flat owner's dues waived against work they did, or a contribution).
async function createPayment(req, res) {
  const { flatId, billId, amount, date, mode, note } = req.body;
  if (!flatId || amount == null || !date) {
    return res
      .status(400)
      .json({ message: "flatId, amount, date are required" });
  }

  const receiptNo = await nextReceiptNumber();
  const payment = await prisma.payment.create({
    data: {
      flatId,
      billId: billId || null,
      amount: Number(amount),
      date: new Date(date),
      mode: mode || "CASH",
      receiptNo,
      note,
    },
  });

  if (billId) {
    await recalcBillStatus(billId);
  }

  if (mode !== "ADJUSTMENT") {
    await appendCashTransaction({
      date: new Date(date),
      type: "IN",
      amount: Number(amount),
      description: `Maintenance collection - ${
        note || "Flat payment"
      } (${receiptNo})`,
      refType: "PAYMENT",
      refId: payment.id,
    });
  }

  const full = await prisma.payment.findUnique({
    where: { id: payment.id },
    include: { flat: true, bill: true },
  });
  res.status(201).json(full);
}

async function getPayment(req, res) {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { flat: true, bill: true },
  });
  if (!payment) return res.status(404).json({ message: "Payment not found" });
  res.json(payment);
}

// Deletes a payment recorded by mistake. Reverses its effects: removes the
// linked Cashbook entry (if it was cash-impacting) and rebuilds the ledger,
// and recalculates the bill's status now that this payment no longer counts.
async function deletePayment(req, res) {
  const existing = await prisma.payment.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ message: "Payment not found" });

  const linkedTx = await prisma.cashTransaction.findFirst({
    where: { refType: "PAYMENT", refId: existing.id },
  });

  await prisma.payment.delete({ where: { id: req.params.id } });

  if (linkedTx) {
    await prisma.cashTransaction.delete({ where: { id: linkedTx.id } });
    await rebuildCashBalances();
  }
  if (existing.billId) {
    await recalcBillStatus(existing.billId);
  }

  res.status(204).end();
}

module.exports = {
  listPayments,
  createPayment,
  getPayment,
  deletePayment,
  appendCashTransaction,
};
