const prisma = require('../config/prisma');

async function listComplaints(req, res) {
  const where = {};
  if (req.user.role === 'RESIDENT') {
    where.flatId = req.user.flatId;
  } else if (req.query.flatId) {
    where.flatId = req.query.flatId;
  }
  if (req.query.status) where.status = req.query.status;

  const complaints = await prisma.complaint.findMany({
    where,
    include: { flat: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(complaints);
}

async function createComplaint(req, res) {
  const { category, description } = req.body;
  const flatId = req.user.role === 'RESIDENT' ? req.user.flatId : req.body.flatId;
  if (!flatId || !category || !description) {
    return res.status(400).json({ message: 'flatId, category, description are required' });
  }
  const complaint = await prisma.complaint.create({
    data: { flatId, category, description },
  });
  res.status(201).json(complaint);
}

async function updateComplaintStatus(req, res) {
  const { status } = req.body;
  if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const complaint = await prisma.complaint.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(complaint);
}

module.exports = { listComplaints, createComplaint, updateComplaintStatus };
