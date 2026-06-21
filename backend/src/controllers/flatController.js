const prisma = require("../config/prisma");
const { getFlatBalance, getCreditProjection } = require("../utils/ledger");

async function listFlats(req, res) {
  const flats = await prisma.flat.findMany({ orderBy: { flatNumber: "asc" } });

  const flatsWithBalance = await Promise.all(
    flats.map(async (flat) => {
      const { totalDue, creditBalance } = await getFlatBalance(flat.id);
      const credit =
        creditBalance > 0 ? await getCreditProjection(flat.id) : null;
      return { ...flat, totalDue, creditBalance, creditProjection: credit };
    })
  );

  res.json(flatsWithBalance);
}

async function getFlat(req, res) {
  const flat = await prisma.flat.findUnique({ where: { id: req.params.id } });
  if (!flat) return res.status(404).json({ message: "Flat not found" });

  const bills = await prisma.maintenanceBill.findMany({
    where: { flatId: flat.id },
    orderBy: { month: "asc" },
  });
  const payments = await prisma.payment.findMany({
    where: { flatId: flat.id },
    orderBy: { date: "asc" },
  });

  const { totalDue, creditBalance } = await getFlatBalance(flat.id);
  const creditProjection =
    creditBalance > 0 ? await getCreditProjection(flat.id) : null;

  res.json({
    ...flat,
    bills,
    payments,
    totalDue,
    creditBalance,
    creditProjection,
  });
}

async function createFlat(req, res) {
  const { flatNumber, ownerName, phone, email, monthlyRate, status } = req.body;
  if (!flatNumber || !ownerName || monthlyRate == null) {
    return res
      .status(400)
      .json({ message: "flatNumber, ownerName, monthlyRate are required" });
  }
  const flat = await prisma.flat.create({
    data: {
      flatNumber,
      ownerName,
      phone,
      email,
      monthlyRate: Number(monthlyRate),
      status: status || "ACTIVE",
    },
  });
  res.status(201).json(flat);
}

async function updateFlat(req, res) {
  const { flatNumber, ownerName, phone, email, monthlyRate, status } = req.body;
  const flat = await prisma.flat.update({
    where: { id: req.params.id },
    data: {
      ...(flatNumber !== undefined && { flatNumber }),
      ...(ownerName !== undefined && { ownerName }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(monthlyRate !== undefined && { monthlyRate: Number(monthlyRate) }),
      ...(status !== undefined && { status }),
    },
  });
  res.json(flat);
}

async function deleteFlat(req, res) {
  await prisma.flat.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

module.exports = { listFlats, getFlat, createFlat, updateFlat, deleteFlat };
