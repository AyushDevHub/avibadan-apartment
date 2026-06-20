const PDFDocument = require("pdfkit");
const prisma = require("../config/prisma");

const SOCIETY_NAME = process.env.SOCIETY_NAME || "AVIBADAN APARTMENT";
const SOCIETY_ADDRESS =
  process.env.SOCIETY_ADDRESS ||
  "361/A, G.T. ROAD (S), BATAITALA BAZAR, HOWRAH - 711103";

function monthLabel(date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// Converts a number to Indian-style words (lakh/crore), e.g. 12345 -> "Twelve Thousand Three Hundred Forty Five"
function numberToWordsIndian(num) {
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

  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function threeDigits(n) {
    if (n < 100) return twoDigits(n);
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 ? " " + twoDigits(n % 100) : "")
    );
  }

  if (num === 0) return "Zero";
  let n = Math.round(num);
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  let parts = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(threeDigits(lakh) + " Lakh");
  if (thousand) parts.push(threeDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));

  return parts.join(" ");
}

async function downloadReceipt(req, res) {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { flat: true, bill: true },
  });
  if (!payment) return res.status(404).json({ message: "Payment not found" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="receipt-${payment.receiptNo}.pdf"`
  );

  const doc = new PDFDocument({ size: "A5", margin: 0 });
  doc.pipe(res);

  const M = 28; // outer margin
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const innerW = pageW - M * 2;

  // Outer border
  doc.rect(M, M, innerW, pageH - M * 2).stroke("#a05530");

  let y = M + 16;

  // Letterhead
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

  // Rule under letterhead
  doc
    .moveTo(M + 16, y)
    .lineTo(pageW - M - 16, y)
    .strokeColor("#d6cdb8")
    .stroke();
  y += 10;

  // "RECEIPT" title
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#a05530")
    .text("MAINTENANCE PAYMENT RECEIPT", M, y, {
      width: innerW,
      align: "center",
    });
  y += 22;

  // Receipt No. / Date row
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

  // Body
  const labelW = 110;
  function row(label, value) {
    doc
      .fontSize(9.5)
      .font("Helvetica")
      .fillColor("#5a6478")
      .text(label, M + 16, y, { width: labelW });
    doc
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .fillColor("#1a1e25")
      .text(value, M + 16 + labelW, y, { width: innerW - 32 - labelW });
    y += doc.heightOfString(value, { width: innerW - 32 - labelW }) + 8;
  }

  row(
    "Received with thanks from:",
    `${payment.flat.ownerName} (${payment.flat.flatNumber})`
  );
  row(
    "Sum of Rupees:",
    `Rs. ${payment.amount.toLocaleString("en-IN")} (${numberToWordsIndian(
      payment.amount
    )} Rupees Only)`
  );
  row(
    "Towards:",
    `Maintenance charges for ${
      payment.bill ? payment.bill.month : monthLabel(payment.date)
    }`
  );
  row(
    "Payment Mode:",
    payment.mode === "ADJUSTMENT"
      ? "Adjustment / Waiver (no cash received)"
      : payment.mode
  );
  if (payment.note) row("Note:", payment.note);

  y += 10;
  doc
    .moveTo(M + 16, y)
    .lineTo(pageW - M - 16, y)
    .strokeColor("#d6cdb8")
    .stroke();
  y += 24;

  // Signature block
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

  // Footer note
  doc
    .fontSize(7)
    .font("Helvetica-Oblique")
    .fillColor("#9a9180")
    .text(
      "This is a system-generated receipt and does not require a physical signature for validity.",
      M + 16,
      pageH - M - 24,
      { width: innerW - 32, align: "center" }
    );

  doc.end();
}

module.exports = { downloadReceipt };
