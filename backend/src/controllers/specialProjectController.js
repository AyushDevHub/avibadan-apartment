const prisma = require("../config/prisma");
const { rebuildCashBalances } = require("../utils/ledger");

// ─── helpers ────────────────────────────────────────────────────────────────

async function withTotals(project) {
  const totalCollected = project.payments.reduce((s, p) => s + p.amount, 0);
  const totalSpent = project.expenses.reduce((s, e) => s + e.amount, 0);
  const totalShare = project.shares.reduce((s, sh) => s + sh.dueAmount, 0);
  const balance = totalCollected - totalSpent; // cash actually sitting in this project's own fund
  return {
    ...project,
    totalCollected,
    totalSpent,
    totalShare,
    balance,
    collectionShortfall: Math.max(project.targetAmount - totalCollected, 0),
  };
}

const include = {
  shares: { include: { flat: true }, orderBy: { flat: { flatNumber: "asc" } } },
  payments: { include: { flat: true }, orderBy: { date: "desc" } },
  expenses: { orderBy: { date: "desc" } },
};

// ─── list / detail ──────────────────────────────────────────────────────────

async function listProjects(req, res) {
  const projects = await prisma.specialProject.findMany({
    include,
    orderBy: { createdAt: "desc" },
  });
  res.json(await Promise.all(projects.map(withTotals)));
}

async function getProject(req, res) {
  const project = await prisma.specialProject.findUnique({
    where: { id: req.params.id },
    include,
  });
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json(await withTotals(project));
}

// ─── create: splits targetAmount across flats by their areaSqFt ───────────

async function createProject(req, res) {
  const { title, description, targetAmount } = req.body;
  if (!title || !targetAmount) {
    return res
      .status(400)
      .json({ message: "title and targetAmount are required" });
  }

  const flats = await prisma.flat.findMany({
    where: { status: "ACTIVE" },
  });
  const flatsWithArea = flats.filter((f) => f.areaSqFt && f.areaSqFt > 0);
  if (!flatsWithArea.length) {
    return res.status(400).json({
      message:
        "No active flats have an area (sq.ft) set. Add areaSqFt on flats first so shares can be split proportionally.",
    });
  }

  const totalSqFt = flatsWithArea.reduce((s, f) => s + f.areaSqFt, 0);

  const project = await prisma.specialProject.create({
    data: {
      title,
      description,
      targetAmount: Number(targetAmount),
      shares: {
        create: flatsWithArea.map((f) => ({
          flatId: f.id,
          areaSqFt: f.areaSqFt,
          dueAmount:
            Math.round((f.areaSqFt / totalSqFt) * Number(targetAmount) * 100) /
            100,
        })),
      },
    },
    include,
  });

  res.status(201).json(await withTotals(project));
}

async function updateProjectStatus(req, res) {
  const { status } = req.body;
  const valid = ["COLLECTING", "IN_PROGRESS", "COMPLETED", "CLOSED"];
  if (!valid.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const project = await prisma.specialProject.update({
    where: { id: req.params.id },
    data: { status },
    include,
  });
  res.json(await withTotals(project));
}

// ─── collections (money coming IN to the project's own fund) ──────────────

async function addPayment(req, res) {
  const { id: projectId } = req.params;
  const { flatId, amount, date, mode, note } = req.body;
  if (!flatId || !amount) {
    return res.status(400).json({ message: "flatId and amount are required" });
  }
  const payment = await prisma.projectPayment.create({
    data: {
      projectId,
      flatId,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      mode: mode || "CASH",
      note,
    },
  });
  res.status(201).json(payment);
}

async function deletePayment(req, res) {
  await prisma.projectPayment.delete({ where: { id: req.params.paymentId } });
  res.json({ ok: true });
}

// ─── expenses (money going OUT of the project's own fund) ─────────────────
// Deliberately does NOT touch the main cashbook — this is the project's own
// separate purse, exactly as requested.

async function addExpense(req, res) {
  const { id: projectId } = req.params;
  const { amount, date, description, billUpload } = req.body;
  if (!amount || !description) {
    return res
      .status(400)
      .json({ message: "amount and description are required" });
  }
  const expense = await prisma.projectExpense.create({
    data: {
      projectId,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      description,
      billUpload,
    },
  });
  res.status(201).json(expense);
}

async function deleteExpense(req, res) {
  await prisma.projectExpense.delete({ where: { id: req.params.expenseId } });
  res.json({ ok: true });
}

// ─── settlement: hand back unused budget to the main cashbook ─────────────
// Only ever pushes the LEFTOVER balance as a single clean IN line into the
// main cashbook, then marks the project CLOSED. Everything that happened
// inside the project (who paid what share, what was spent on what) stays on
// this project's own record and never clutters the main cashbook.

async function closeProject(req, res) {
  const { id } = req.params;
  const { note } = req.body;

  const project = await prisma.specialProject.findUnique({
    where: { id },
    include,
  });
  if (!project) return res.status(404).json({ message: "Project not found" });
  if (project.status === "CLOSED") {
    return res.status(400).json({ message: "Project already closed" });
  }

  const totals = await withTotals(project);

  const result = await prisma.$transaction(async (tx) => {
    if (totals.balance > 0) {
      await tx.cashTransaction.create({
        data: {
          date: new Date(),
          type: "IN",
          amount: totals.balance,
          balance: 0, // recalculated below by rebuildCashBalances()
          description: `Unused budget returned from project: ${project.title}`,
          refType: "special_project",
          refId: project.id,
        },
      });
    }

    return tx.specialProject.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closingNote: note || null,
      },
      include,
    });
  });

  if (totals.balance > 0) await rebuildCashBalances();

  res.json(await withTotals(result));
}

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProjectStatus,
  addPayment,
  deletePayment,
  addExpense,
  deleteExpense,
  closeProject,
};
