const prisma = require("../config/prisma");
const { recalcBillStatus, rebuildCashBalances } = require("../utils/ledger");

async function nextReceiptNumber() {
  const count = await prisma.payment.count();
  const year = new Date().getFullYear();
  return `AV/${year}/${String(count + 1).padStart(4, "0")}`;
}

// A resident paid an expense directly out of pocket (e.g. paid the
// electricity bill themselves) instead of giving cash to the admin.
//
// This creates the Expense (so it shows correctly in reports/categories)
// WITHOUT posting to the Cashbook - no real cash moved through your hands.
// It then auto-applies the same amount as a waiver against that flat's
// oldest unpaid bills first, same as paying off old debts before new ones.
// Any leftover after all dues are cleared is recorded as an advance credit.
async function createContribution(req, res) {
  const { flatId, category, amount, date, description } = req.body;
  if (!flatId || !category || amount == null || !date || !description) {
    return res
      .status(400)
      .json({
        message: "flatId, category, amount, date, description are required",
      });
  }

  const totalAmount = Number(amount);
  if (totalAmount <= 0)
    return res
      .status(400)
      .json({ message: "Amount must be greater than zero" });

  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat) return res.status(404).json({ message: "Flat not found" });

  // 1. Record the expense - no cash transaction, since no cash actually moved.
  const expense = await prisma.expense.create({
    data: {
      category,
      amount: totalAmount,
      date: new Date(date),
      description,
      paidByFlatId: flatId,
    },
  });

  // 2. Auto-apply the amount as a waiver against this flat's oldest unpaid
  //    bills first (FIFO), creating one ADJUSTMENT payment per bill touched.
  const openBills = await prisma.maintenanceBill.findMany({
    where: { flatId, status: { in: ["UNPAID", "PARTIAL"] } },
    orderBy: { month: "asc" },
  });

  let remaining = totalAmount;
  const paymentsCreated = [];

  for (const bill of openBills) {
    if (remaining <= 0) break;

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
        mode: "ADJUSTMENT",
        receiptNo,
        note: `Waived against ${category.replace(
          "_",
          " "
        )} paid directly: ${description}`,
      },
    });
    paymentsCreated.push(payment);
    await recalcBillStatus(bill.id);
    remaining -= allocate;
  }

  // 3. Leftover (paid more than current dues) becomes an unlinked advance credit.
  if (remaining > 0) {
    const receiptNo = await nextReceiptNumber();
    const payment = await prisma.payment.create({
      data: {
        flatId,
        billId: null,
        amount: remaining,
        date: new Date(date),
        mode: "ADJUSTMENT",
        receiptNo,
        note: `Advance credit from ${category.replace(
          "_",
          " "
        )} paid directly: ${description}`,
      },
    });
    paymentsCreated.push(payment);
  }

  res.status(201).json({ expense, paymentsCreated });
}

module.exports = { createContribution };
