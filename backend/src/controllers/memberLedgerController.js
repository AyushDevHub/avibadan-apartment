const prisma = require("../config/prisma");

// Returns a collector-member's full personal ledger:
// - What they spent from pocket (SPENT entries)
// - What they topped up (TOPPED_UP entries)
// - What the society has reimbursed them (REIMBURSED)
// - Net balance = what society currently owes them (positive) or they owe (negative)
async function getMemberLedger(req, res) {
  const { flatId } = req.params;

  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat) return res.status(404).json({ message: "Flat not found" });

  const entries = await prisma.memberLedgerEntry.findMany({
    where: { flatId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const totalSpent = entries
    .filter((e) => e.type === "SPENT")
    .reduce((s, e) => s + e.amount, 0);
  const totalToppedUp = entries
    .filter((e) => e.type === "TOPPED_UP")
    .reduce((s, e) => s + e.amount, 0);
  const totalReimbursed = entries
    .filter((e) => e.type === "REIMBURSED")
    .reduce((s, e) => s + e.amount, 0);

  // Positive = society owes member. Negative = member owes society.
  const netBalance = totalSpent + totalToppedUp - totalReimbursed;

  res.json({
    flat,
    entries,
    totalSpent,
    totalToppedUp,
    totalReimbursed,
    netBalance,
  });
}

// List every flat that has ever contributed/spent on the society's behalf,
// with their current net balance. There is no fixed "collector" — anyone
// who has at least one ledger entry shows up here automatically.
async function getAllMemberLedgers(req, res) {
  const contributors = await prisma.flat.findMany({
    where: { memberLedgerEntries: { some: {} } },
    orderBy: { flatNumber: "asc" },
  });

  const result = await Promise.all(
    contributors.map(async (flat) => {
      const entries = await prisma.memberLedgerEntry.findMany({
        where: { flatId: flat.id },
      });
      const totalSpent = entries
        .filter((e) => e.type === "SPENT")
        .reduce((s, e) => s + e.amount, 0);
      const totalToppedUp = entries
        .filter((e) => e.type === "TOPPED_UP")
        .reduce((s, e) => s + e.amount, 0);
      const totalReimbursed = entries
        .filter((e) => e.type === "REIMBURSED")
        .reduce((s, e) => s + e.amount, 0);
      const netBalance = totalSpent + totalToppedUp - totalReimbursed;
      return {
        ...flat,
        totalSpent,
        totalToppedUp,
        totalReimbursed,
        netBalance,
        entryCount: entries.length,
      };
    })
  );

  res.json(result);
}

// Add an entry: SPENT (paid expense from pocket), TOPPED_UP (added own cash),
// or REIMBURSED (society paid them back).
// When type=SPENT, also creates the Expense record so it shows in expense reports.
async function addEntry(req, res) {
  const { flatId, date, type, amount, description, expenseCategory } = req.body;
  if (!flatId || !date || !type || amount == null || !description)
    return res
      .status(400)
      .json({ message: "flatId, date, type, amount, description required" });

  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat) return res.status(404).json({ message: "Flat not found" });
  // No fixed "collector" role — any resident can top up cash or spend on
  // the society's behalf whenever they choose to, so no isCollector gate here.

  let expenseId = null;

  if (type === "SPENT" && expenseCategory) {
    // Auto-create the Expense record so it shows in Expenses page and reports
    const expense = await prisma.expense.create({
      data: {
        category: expenseCategory,
        amount: Number(amount),
        date: new Date(date),
        description,
        paidByFlatId: flatId,
        // Does NOT post to cashbook (no cash changed hands - member paid from pocket)
      },
    });
    expenseId = expense.id;
  }

  if (type === "TOPPED_UP") {
    // Society cash box received actual cash from member — post to cashbook as IN
    const { appendCashTransaction } = require("./paymentController");
    await appendCashTransaction({
      date: new Date(date),
      type: "IN",
      amount: Number(amount),
      description: `${flat.ownerName} topped up society cash — ${description}`,
      refType: "MANUAL",
      refId: null,
    });
  }

  if (type === "REIMBURSED") {
    // Society paid member back — post to cashbook as OUT
    const { appendCashTransaction } = require("./paymentController");
    await appendCashTransaction({
      date: new Date(date),
      type: "OUT",
      amount: Number(amount),
      description: `Reimbursed ${flat.ownerName} — ${description}`,
      refType: "MANUAL",
      refId: null,
    });
  }

  const entry = await prisma.memberLedgerEntry.create({
    data: {
      flatId,
      date: new Date(date),
      type,
      amount: Number(amount),
      description,
      expenseId,
    },
  });

  res.status(201).json(entry);
}

async function deleteEntry(req, res) {
  const entry = await prisma.memberLedgerEntry.findUnique({
    where: { id: req.params.id },
  });
  if (!entry) return res.status(404).json({ message: "Entry not found" });

  // If it created an expense, delete that too
  if (entry.expenseId) {
    await prisma.expense
      .delete({ where: { id: entry.expenseId } })
      .catch(() => {});
  }

  await prisma.memberLedgerEntry.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

module.exports = {
  getMemberLedger,
  getAllMemberLedgers,
  addEntry,
  deleteEntry,
};
