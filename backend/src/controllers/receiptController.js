const PDFDocument = require("pdfkit");
const prisma = require("../config/prisma");

const SOCIETY_NAME = process.env.SOCIETY_NAME || "AVIBADAN APARTMENT";
const SOCIETY_ADDRESS =
  process.env.SOCIETY_ADDRESS ||
  "361/A, G.T. ROAD (S), BATAITALA BAZAR, HOWRAH - 711103";

function toWords(num) {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  function two(n) {
    return n < 20
      ? ones[n]
      : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function three(n) {
    return n < 100
      ? two(n)
      : ones[Math.floor(n / 100)] +
          " Hundred" +
          (n % 100 ? " " + two(n % 100) : "");
  }
  if (!num) return "Zero";
  let n = Math.round(num),
    parts = [];
  const cr = Math.floor(n / 10000000);
  n %= 10000000;
  const la = Math.floor(n / 100000);
  n %= 100000;
  const th = Math.floor(n / 1000);
  n %= 1000;
  if (cr) parts.push(three(cr) + " Crore");
  if (la) parts.push(three(la) + " Lakh");
  if (th) parts.push(three(th) + " Thousand");
  if (n) parts.push(three(n));
  return parts.join(" ");
}

function drawHeader(doc, M, pageW, innerW) {
  let y = M + 16;
  doc
    .fontSize(17)
    .font("Helvetica-Bold")
    .fillColor("#1a1e25")
    .text(SOCIETY_NAME, M, y, { width: innerW, align: "center" });
  y += 22;
  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor("#5a6478")
    .text(SOCIETY_ADDRESS, M, y, { width: innerW, align: "center" });
  y += 18;
  doc
    .moveTo(M + 16, y)
    .lineTo(pageW - M - 16, y)
    .strokeColor("#d6cdb8")
    .stroke();
  y += 10;
  return y;
}

// Single-payment receipt.
async function downloadReceipt(req, res) {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { flat: true, bill: true },
  });
  if (!payment) return res.status(404).json({ message: "Payment not found" });

  // If this payment belongs to a group, redirect to the group receipt.
  if (payment.groupReceiptNo) {
    return res.redirect(
      `/api/receipts/group/${encodeURIComponent(payment.groupReceiptNo)}`
    );
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="receipt-${payment.receiptNo}.pdf"`
  );

  const doc = new PDFDocument({ size: "A5", margin: 0 });
  doc.pipe(res);
  const M = 28,
    pageW = doc.page.width,
    innerW = pageW - M * 2;
  doc.rect(M, M, innerW, doc.page.height - M * 2).stroke("#a05530");

  let y = drawHeader(doc, M, pageW, innerW);
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#a05530")
    .text("MAINTENANCE PAYMENT RECEIPT", M, y, {
      width: innerW,
      align: "center",
    });
  y += 22;
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#1a1e25");
  doc.text(`Receipt No: ${payment.receiptNo}`, M + 16, y);
  doc.text(
    `Date: ${payment.date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`,
    M + 16,
    y,
    { width: innerW - 32, align: "right" }
  );
  y += 20;
  doc
    .moveTo(M + 16, y)
    .lineTo(pageW - M - 16, y)
    .strokeColor("#d6cdb8")
    .stroke();
  y += 14;

  const lW = 110;
  function row(label, value) {
    doc
      .fontSize(9.5)
      .font("Helvetica")
      .fillColor("#5a6478")
      .text(label, M + 16, y, { width: lW });
    doc
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .fillColor("#1a1e25")
      .text(value, M + 16 + lW, y, { width: innerW - 32 - lW });
    y += doc.heightOfString(value, { width: innerW - 32 - lW }) + 8;
  }

  row(
    "Received from:",
    `${payment.flat.ownerName} (${payment.flat.flatNumber})`
  );
  row(
    "Sum of Rupees:",
    `₹${payment.amount.toLocaleString("en-IN")} (${toWords(
      payment.amount
    )} Rupees Only)`
  );
  row(
    "For:",
    `Maintenance charges — ${
      payment.bill
        ? payment.bill.month
        : payment.date.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })
    }`
  );
  row(
    "Mode:",
    payment.mode === "ADJUSTMENT" ? "Adjustment/Waiver" : payment.mode
  );
  if (payment.note) row("Note:", payment.note);

  y += 10;
  doc
    .moveTo(M + 16, y)
    .lineTo(pageW - M - 16, y)
    .strokeColor("#d6cdb8")
    .stroke();
  y += 24;
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#5a6478")
    .text(`For ${SOCIETY_NAME}`, M + 16, y, {
      width: innerW - 32,
      align: "right",
    });
  y += 36;
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#1a1e25")
    .text("Authorized Signatory", M + 16, y, {
      width: innerW - 32,
      align: "right",
    });
  doc
    .fontSize(7)
    .font("Helvetica-Oblique")
    .fillColor("#9a9180")
    .text("System-generated receipt.", M + 16, doc.page.height - M - 20, {
      width: innerW - 32,
      align: "center",
    });
  doc.end();
}

// Consolidated group receipt — one PDF for all months in a multi-month payment.
async function downloadGroupReceipt(req, res) {
  const groupReceiptNo = decodeURIComponent(req.params.groupNo);
  const payments = await prisma.payment.findMany({
    where: { groupReceiptNo },
    include: { flat: true, bill: true },
    orderBy: { date: "asc" },
  });
  if (!payments.length)
    return res.status(404).json({ message: "Group receipt not found" });

  const flat = payments[0].flat;
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const payDate = payments[0].date;
  const mode = payments[0].mode;

  // Find actual months covered (exclude advance credit entries).
  const monthPayments = payments.filter((p) => p.bill);
  const advancePayment = payments.find((p) => !p.bill);
  const paidThrough = monthPayments.length
    ? monthPayments[monthPayments.length - 1].bill.month
    : null;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="receipt-${groupReceiptNo.replace(/\//g, "-")}.pdf"`
  );

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  doc.pipe(res);
  const M = 32,
    pageW = doc.page.width,
    innerW = pageW - M * 2;
  doc.rect(M, M, innerW, doc.page.height - M * 2).stroke("#a05530");

  let y = drawHeader(doc, M, pageW, innerW);
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor("#a05530")
    .text("CONSOLIDATED MAINTENANCE RECEIPT", M, y, {
      width: innerW,
      align: "center",
    });
  y += 24;
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#1a1e25");
  doc.text(`Receipt No: ${groupReceiptNo}`, M + 16, y);
  doc.text(
    `Date: ${payDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`,
    M + 16,
    y,
    { width: innerW - 32, align: "right" }
  );
  y += 20;
  doc
    .moveTo(M + 16, y)
    .lineTo(pageW - M - 16, y)
    .strokeColor("#d6cdb8")
    .stroke();
  y += 14;

  // Summary block
  const lW = 130;
  function row(label, value) {
    doc
      .fontSize(9.5)
      .font("Helvetica")
      .fillColor("#5a6478")
      .text(label, M + 16, y, { width: lW });
    doc
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .fillColor("#1a1e25")
      .text(value, M + 16 + lW, y, { width: innerW - 32 - lW });
    y += 16;
  }
  row("Received from:", `${flat.ownerName} (${flat.flatNumber})`);
  row(
    "Total Amount:",
    `₹${totalAmount.toLocaleString("en-IN")} (${toWords(
      totalAmount
    )} Rupees Only)`
  );
  row("Payment Mode:", mode === "ADJUSTMENT" ? "Adjustment/Waiver" : mode);
  if (paidThrough) row("Paid Through:", paidThrough);
  if (payments[0].note) row("Note:", payments[0].note);

  y += 12;
  doc
    .moveTo(M + 16, y)
    .lineTo(pageW - M - 16, y)
    .strokeColor("#d6cdb8")
    .stroke();
  y += 14;

  // Breakdown table
  doc
    .fontSize(9.5)
    .font("Helvetica-Bold")
    .fillColor("#1a1e25")
    .text("Month-wise Breakdown", M + 16, y);
  y += 16;

  // Table header
  doc.rect(M + 16, y, innerW - 32, 18).fill("#1a1e25");
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#ffffff");
  doc.text("Month", M + 22, y + 4, { width: 100 });
  doc.text("Amount (₹)", M + 22 + 100, y + 4, { width: 120 });
  doc.text("Mode", M + 22 + 220, y + 4, { width: 80 });
  doc.text("Status", M + 22 + 300, y + 4, { width: 80 });
  y += 18;

  // Table rows
  for (const p of monthPayments) {
    const isEven = monthPayments.indexOf(p) % 2 === 0;
    if (isEven) doc.rect(M + 16, y, innerW - 32, 16).fill("#f9f6ef");
    doc.fontSize(8.5).font("Helvetica").fillColor("#1a1e25");
    doc.text(p.bill?.month || "—", M + 22, y + 3, { width: 100 });
    doc.text(`₹${p.amount.toLocaleString("en-IN")}`, M + 22 + 100, y + 3, {
      width: 120,
    });
    doc.text(p.mode === "ADJUSTMENT" ? "Waiver" : p.mode, M + 22 + 220, y + 3, {
      width: 80,
    });
    doc.text("PAID", M + 22 + 300, y + 3, { width: 80, color: "#3e7a52" });
    y += 16;
  }
  if (advancePayment) {
    doc.rect(M + 16, y, innerW - 32, 16).fill("#fbf3e3");
    doc.fontSize(8.5).font("Helvetica").fillColor("#1a1e25");
    doc.text("Advance Credit", M + 22, y + 3, { width: 100 });
    doc.text(
      `₹${advancePayment.amount.toLocaleString("en-IN")}`,
      M + 22 + 100,
      y + 3,
      { width: 120 }
    );
    doc.text(
      advancePayment.mode === "ADJUSTMENT" ? "Waiver" : advancePayment.mode,
      M + 22 + 220,
      y + 3,
      { width: 80 }
    );
    doc.text("CREDITED", M + 22 + 300, y + 3, { width: 80 });
    y += 16;
  }

  // Total row
  doc.rect(M + 16, y, innerW - 32, 20).fill("#1a1e25");
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#ffffff");
  doc.text("TOTAL", M + 22, y + 5, { width: 100 });
  doc.text(`₹${totalAmount.toLocaleString("en-IN")}`, M + 22 + 100, y + 5, {
    width: 220,
  });
  y += 20;

  y += 30;
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#5a6478")
    .text(`For ${SOCIETY_NAME}`, M + 16, y, {
      width: innerW - 32,
      align: "right",
    });
  y += 36;
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#1a1e25")
    .text("Authorized Signatory", M + 16, y, {
      width: innerW - 32,
      align: "right",
    });
  doc
    .fontSize(7)
    .font("Helvetica-Oblique")
    .fillColor("#9a9180")
    .text("System-generated receipt.", M + 16, doc.page.height - M - 20, {
      width: innerW - 32,
      align: "center",
    });
  doc.end();
}

module.exports = { downloadReceipt, downloadGroupReceipt };
