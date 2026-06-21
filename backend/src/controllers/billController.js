const prisma = require("../config/prisma");
const { recalcBillStatus, getFlatBalance } = require("../utils/ledger");

async function nextReceiptNumber() {
  const count = await prisma.payment.count();
  const year = new Date().getFullYear();
  return `AV/${year}/${String(count + 1).padStart(4, "0")}`;
}

// Generate a maintenance bill for every active flat for a given month.
// If a flat has a credit balance (e.g. they overpaid for a repair they did
// directly), that credit is automatically applied to the new bill - no
// manual step needed. The bill comes out already marked PAID/PARTIAL and
// the credit balance visibly shrinks.
async function generateBills(req, res) {
  const { month, dueDate } = req.body; // month: 'YYYY-MM'
  if (!month || !dueDate)
    return res.status(400).json({ message: "month and dueDate are required" });

  const flats = await prisma.flat.findMany({ where: { status: "ACTIVE" } });

  const created = [];
  let autoPaidFromCredit = 0;

  for (const flat of flats) {
    const existing = await prisma.maintenanceBill.findUnique({
      where: { flatId_month: { flatId: flat.id, month } },
    });
    if (existing) continue;

    // Check credit BEFORE creating this bill, so the new bill doesn't count
    // against itself.
    const { creditBalance } = await getFlatBalance(flat.id);

    const bill = await prisma.maintenanceBill.create({
      data: {
        flatId: flat.id,
        month,
        amount: flat.monthlyRate,
        dueDate: new Date(dueDate),
        status: "UNPAID",
      },
    });
    created.push(bill);

    if (creditBalance > 0) {
      const allocate = Math.min(creditBalance, bill.amount);
      const receiptNo = await nextReceiptNumber();
      await prisma.payment.create({
        data: {
          flatId: flat.id,
          billId: bill.id,
          amount: allocate,
          date: new Date(dueDate),
          mode: "ADJUSTMENT",
          receiptNo,
          note: "Auto-applied from credit balance (overpayment carried forward)",
        },
      });
      await recalcBillStatus(bill.id);
      autoPaidFromCredit++;
    }
  }

  res
    .status(201)
    .json({ createdCount: created.length, autoPaidFromCredit, bills: created });
}

async function listBills(req, res) {
  const { month, status, flatId } = req.query;
  const bills = await prisma.maintenanceBill.findMany({
    where: {
      ...(month && { month }),
      ...(status && { status }),
      ...(flatId && { flatId }),
    },
    include: { flat: true },
    orderBy: [{ month: "desc" }, { flat: { flatNumber: "asc" } }],
  });
  res.json(bills);
}

async function updateBill(req, res) {
  const { amount, dueDate, status, note } = req.body;
  const bill = await prisma.maintenanceBill.update({
    where: { id: req.params.id },
    data: {
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
      ...(status !== undefined && { status }),
      ...(note !== undefined && { note }),
    },
  });
  res.json(bill);
}

// Mark a bill as waived (e.g. adjusted against future work)
async function waiveBill(req, res) {
  const { note } = req.body;
  const bill = await prisma.maintenanceBill.update({
    where: { id: req.params.id },
    data: { status: "WAIVED", note: note || "Waived/adjusted" },
  });
  res.json(bill);
}

module.exports = { generateBills, listBills, updateBill, waiveBill };
