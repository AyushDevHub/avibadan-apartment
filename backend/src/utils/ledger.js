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

module.exports = { rebuildCashBalances, rebuildBankBalances, recalcBillStatus };
