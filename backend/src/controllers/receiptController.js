const PDFDocument = require('pdfkit');
const prisma = require('../config/prisma');

const SOCIETY_NAME = process.env.SOCIETY_NAME || 'AVIBADAN APARTMENT';
const SOCIETY_ADDRESS = process.env.SOCIETY_ADDRESS || '361/A, G.T. ROAD (S), BATAITALA BAZAR, HOWRAH - 711103';

function monthLabel(date) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

async function downloadReceipt(req, res) {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { flat: true, bill: true },
  });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="receipt-${payment.receiptNo}.pdf"`);

  const doc = new PDFDocument({ size: 'A5', margin: 36 });
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text(SOCIETY_NAME, { align: 'center' });
  doc.fontSize(9).font('Helvetica').text(SOCIETY_ADDRESS, { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(36, doc.y).lineTo(doc.page.width - 36, doc.y).stroke();
  doc.moveDown(1);

  doc.fontSize(11);
  doc.text(`Receipt No.: ${payment.receiptNo}`, { continued: true });
  doc.text(`   Date: ${payment.date.toLocaleDateString('en-IN')}`, { align: 'right' });
  doc.moveDown(0.5);
  doc.text(`Name: ${payment.flat.ownerName}`);
  doc.moveDown(0.5);
  doc.text(`Flat/Shop No.: ${payment.flat.flatNumber}`);
  doc.moveDown(0.5);
  doc.text(`Received the sum of Rs. ${payment.amount.toLocaleString('en-IN')}`);
  doc.moveDown(0.5);
  doc.text(`As maintenance charges for the month of: ${payment.bill ? payment.bill.month : monthLabel(payment.date)}`);
  doc.moveDown(0.5);
  doc.text(`Payment mode: ${payment.mode}`);
  if (payment.note) {
    doc.moveDown(0.5);
    doc.text(`Note: ${payment.note}`);
  }

  doc.moveDown(3);
  doc.fontSize(10).text('Collector: ____________________', { align: 'right' });

  doc.end();
}

module.exports = { downloadReceipt };
