const PDFDocument = require("pdfkit");
const path = require("path");
const prisma = require("../config/prisma");

const SOCIETY_NAME = process.env.SOCIETY_NAME || "AVIBADAN APARTMENT";
const SOCIETY_ADDRESS =
  process.env.SOCIETY_ADDRESS ||
  "361/A, G.T. ROAD (S), BATAITALA BAZAR, HOWRAH - 711103";
// The person who physically collects maintenance and whose signature
// appears on every receipt. Change here if the collector role changes.
const COLLECTOR_NAME = process.env.RECEIPT_COLLECTOR_NAME || "Ukil Shaw";
const COLLECTOR_TITLE =
  process.env.RECEIPT_COLLECTOR_TITLE || "Maintenance Collector";

// ─── PALETTE ────────────────────────────────────────────────────────────────
const INK = "#2b241c"; // primary text
const MAROON = "#7a2e2e"; // headings / accents
const MAROON_DEEP = "#5c2222";
const GOLD = "#b8874b"; // borders / rules
const GOLD_SOFT = "#e4d3ad";
const CREAM = "#fbf6ec"; // page background
const CREAM_PANEL = "#f4ead6"; // amount box background
const MUTED = "#8a7a63"; // secondary labels
const GREEN = "#3e6b4f";

// ─── FONTS ──────────────────────────────────────────────────────────────────
const FONT_DIR = path.join(__dirname, "..", "..", "assets", "fonts");
const F = {
  display: path.join(FONT_DIR, "Gloock-Regular.ttf"), // society name / titles
  serif: path.join(FONT_DIR, "CrimsonPro-Regular.ttf"), // body text
  serifBold: path.join(FONT_DIR, "CrimsonPro-Bold.ttf"), // emphasis
  serifItalic: path.join(FONT_DIR, "CrimsonPro-Italic.ttf"), // address / notes
  signature: path.join(FONT_DIR, "NothingYouCouldDo-Regular.ttf"), // collector's signature
};

function registerFonts(doc) {
  doc.registerFont("display", F.display);
  doc.registerFont("serif", F.serif);
  doc.registerFont("serifBold", F.serifBold);
  doc.registerFont("serifItalic", F.serifItalic);
  doc.registerFont("signature", F.signature);
}

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

// ─── ORNAMENTS ──────────────────────────────────────────────────────────────

// Cream page fill + a fine gold outer rule and a hairline inner rule, with
// small L-shaped corner ticks — the "certificate" look.
function drawFrame(doc, M, pageW, pageH) {
  doc.rect(0, 0, pageW, pageH).fill(CREAM);

  const outer = M;
  const inner = M + 9;
  doc.lineWidth(1.4).strokeColor(GOLD);
  doc.rect(outer, outer, pageW - outer * 2, pageH - outer * 2).stroke();
  doc.lineWidth(0.6).strokeColor(GOLD_SOFT);
  doc.rect(inner, inner, pageW - inner * 2, pageH - inner * 2).stroke();

  const tick = 14;
  const corners = [
    [outer, outer, 1, 1],
    [pageW - outer, outer, -1, 1],
    [outer, pageH - outer, 1, -1],
    [pageW - outer, pageH - outer, -1, -1],
  ];
  doc.lineWidth(1.6).strokeColor(MAROON);
  corners.forEach(([x, y, dx, dy]) => {
    doc
      .moveTo(x, y + dy * tick)
      .lineTo(x, y)
      .lineTo(x + dx * tick, y)
      .stroke();
  });
}

// Extremely faint, large, rotated society initials behind the content —
// like security watermark paper. Purely decorative, never interferes with
// legibility since opacity is very low.
function drawWatermark(doc, pageW, pageH) {
  // The rotated, oversized watermark text's un-rotated bounding box can
  // exceed the page height, which would otherwise make PDFKit silently
  // start a second page mid-draw. Suppress pagination just for this call.
  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = () => doc;

  doc.save();
  doc.opacity(0.05);
  doc
    .font("display")
    .fontSize(Math.min(pageW, pageH) * 0.42)
    .fillColor(MAROON);
  doc.rotate(-28, { origin: [pageW / 2, pageH / 2] });
  doc.text("AVIBADAN", 0, pageH / 2 - 60, {
    width: pageW,
    align: "center",
    lineBreak: false,
  });
  doc.restore();
  doc.opacity(1);

  doc.addPage = originalAddPage;
}

// A small circular seal with the society's initials — stands in for a crest
// since no logo image is available.
function drawSeal(doc, cx, cy, r) {
  doc.save();
  doc.lineWidth(1.2).strokeColor(MAROON);
  doc.circle(cx, cy, r).stroke();
  doc.lineWidth(0.6).strokeColor(GOLD);
  doc.circle(cx, cy, r - 4).stroke();
  doc
    .font("display")
    .fontSize(r * 0.62)
    .fillColor(MAROON)
    .text("AV", cx - r, cy - r * 0.42, { width: r * 2, align: "center" });
  doc.restore();
}

function drawHeader(doc, M, pageW, innerW) {
  let y = M + 26;
  const sealR = 20;
  drawSeal(doc, pageW / 2, y + 2, sealR);
  y += sealR * 2 + 14;

  doc
    .font("display")
    .fontSize(19)
    .fillColor(MAROON_DEEP)
    .text(SOCIETY_NAME, M, y, {
      width: innerW,
      align: "center",
      characterSpacing: 1.6,
    });
  y += 26;
  doc
    .font("serifItalic")
    .fontSize(9)
    .fillColor(MUTED)
    .text(SOCIETY_ADDRESS, M, y, { width: innerW, align: "center" });
  y += 20;

  // Ornamental center-diamond divider
  const midX = pageW / 2;
  doc
    .moveTo(M + 20, y)
    .lineTo(midX - 8, y)
    .strokeColor(GOLD)
    .lineWidth(0.8)
    .stroke();
  doc
    .moveTo(midX + 8, y)
    .lineTo(pageW - M - 20, y)
    .stroke();
  doc.save();
  doc.translate(midX, y);
  doc.rotate(45);
  doc.rect(-4, -4, 8, 8).fillColor(GOLD).fill();
  doc.restore();

  return y + 16;
}

// The maroon banner bearing the receipt's title (e.g. "MAINTENANCE PAYMENT
// RECEIPT"), rendered in cream letter-spaced caps.
function drawTitleBanner(doc, title, M, pageW, innerW, y) {
  const h = 24;
  doc.rect(M + 16, y, innerW - 32, h).fill(MAROON);
  doc
    .font("display")
    .fontSize(11)
    .fillColor(CREAM)
    .text(title, M + 16, y + 7, {
      width: innerW - 32,
      align: "center",
      characterSpacing: 2,
    });
  return y + h + 18;
}

function drawMetaRow(doc, receiptNo, dateLabel, M, pageW, innerW, y) {
  doc.font("serifBold").fontSize(9.5).fillColor(INK);
  doc.text(`Receipt No.  ${receiptNo}`, M + 16, y, { width: innerW / 2 - 16 });
  doc.text(`Date  ${dateLabel}`, M + 16, y, {
    width: innerW - 32,
    align: "right",
  });
  y += 18;
  doc
    .moveTo(M + 16, y)
    .lineTo(pageW - M - 16, y)
    .strokeColor(GOLD_SOFT)
    .lineWidth(0.6)
    .stroke();
  return y + 16;
}

// One label/value line with a fine dotted leader, like a formal certificate
// field ("Received from ..........................").
function drawFieldRow(doc, label, value, M, innerW, y, opts = {}) {
  const labelW = opts.labelW || 118;
  doc
    .font("serif")
    .fontSize(9.5)
    .fillColor(MUTED)
    .text(label, M + 16, y, { width: labelW });
  const valueX = M + 16 + labelW;
  const valueW = innerW - 32 - labelW;
  doc
    .font("serifBold")
    .fontSize(10)
    .fillColor(INK)
    .text(value, valueX, y - 1, { width: valueW });
  const h = doc.heightOfString(value, { width: valueW });
  return y + Math.max(h, 13) + 10;
}

// The boxed "Sum of Rupees" amount panel — the certificate-style highlight
// of the receipt, echoing a bank pay-in slip.
function drawAmountPanel(doc, amount, M, innerW, y) {
  const wordsText = `(${toWords(amount)} Rupees Only)`;
  const wordsW = innerW - 60;
  doc.font("serifItalic").fontSize(8.5);
  const wordsH = doc.heightOfString(wordsText, { width: wordsW });
  const boxH = Math.max(68, 52 + wordsH + 10);

  doc.rect(M + 16, y, innerW - 32, boxH).fill(CREAM_PANEL);
  doc
    .lineWidth(0.8)
    .strokeColor(GOLD)
    .rect(M + 16, y, innerW - 32, boxH)
    .stroke();

  doc
    .font("serif")
    .fontSize(8.5)
    .fillColor(MUTED)
    .text("SUM OF RUPEES", M + 28, y + 10, { characterSpacing: 1 });
  doc
    .font("display")
    .fontSize(17)
    .fillColor(MAROON_DEEP)
    .text(`Rs. ${amount.toLocaleString("en-IN")}/-`, M + 28, y + 24);
  doc
    .font("serifItalic")
    .fontSize(8.5)
    .fillColor(INK)
    .text(wordsText, M + 28, y + 52, { width: wordsW });

  return y + boxH + 18;
}

// Cursive collector signature + printed name/title, drawn just above the
// footer rule on the right-hand side.
function drawSignatureBlock(doc, M, pageW, innerW, y) {
  const blockW = 190;
  const x = pageW - M - 16 - blockW;

  doc
    .font("serif")
    .fontSize(8.5)
    .fillColor(MUTED)
    .text(`For ${SOCIETY_NAME}`, x, y, { width: blockW, align: "center" });
  y += 14;

  doc
    .font("signature")
    .fontSize(26)
    .fillColor(MAROON_DEEP)
    .text(COLLECTOR_NAME, x, y, { width: blockW, align: "center" });
  y += 34;

  doc
    .moveTo(x + 16, y)
    .lineTo(x + blockW - 16, y)
    .strokeColor(GOLD)
    .lineWidth(0.7)
    .stroke();
  y += 6;

  doc
    .font("serifBold")
    .fontSize(9.5)
    .fillColor(INK)
    .text(COLLECTOR_NAME, x, y, { width: blockW, align: "center" });
  y += 13;
  doc
    .font("serifItalic")
    .fontSize(8)
    .fillColor(MUTED)
    .text(COLLECTOR_TITLE, x, y, { width: blockW, align: "center" });

  return y + 14;
}

function drawFootnote(doc, M, pageW, innerW, pageH) {
  doc
    .font("serifItalic")
    .fontSize(7)
    .fillColor(MUTED)
    .text(
      "This is a system-generated receipt and is valid without a physical stamp.",
      M + 16,
      pageH - M - 18,
      { width: innerW - 32, align: "center" }
    );
}

// ─── SINGLE-PAYMENT RECEIPT ────────────────────────────────────────────────
async function downloadReceipt(req, res) {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { flat: true, bill: true },
  });
  if (!payment) return res.status(404).json({ message: "Payment not found" });

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
  registerFonts(doc);
  doc.pipe(res);
  const M = 26,
    pageW = doc.page.width,
    pageH = doc.page.height,
    innerW = pageW - M * 2;

  drawFrame(doc, M, pageW, pageH);
  drawWatermark(doc, pageW, pageH);

  let y = drawHeader(doc, M, pageW, innerW);
  y = drawTitleBanner(doc, "MAINTENANCE PAYMENT RECEIPT", M, pageW, innerW, y);
  y = drawMetaRow(
    doc,
    payment.receiptNo,
    payment.date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    M,
    pageW,
    innerW,
    y
  );

  y = drawFieldRow(
    doc,
    "Received from",
    `${payment.flat.ownerName}  (${payment.flat.flatNumber})`,
    M,
    innerW,
    y
  );
  y = drawFieldRow(
    doc,
    "Towards",
    `Maintenance charges — ${
      payment.bill
        ? payment.bill.month
        : payment.date.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })
    }`,
    M,
    innerW,
    y
  );
  y = drawFieldRow(
    doc,
    "Mode of payment",
    payment.mode === "ADJUSTMENT" ? "Adjustment / Waiver" : payment.mode,
    M,
    innerW,
    y
  );
  if (payment.note) y = drawFieldRow(doc, "Note", payment.note, M, innerW, y);

  y += 4;
  y = drawAmountPanel(doc, payment.amount, M, innerW, y);

  drawSignatureBlock(doc, M, pageW, innerW, pageH - M - 92);
  drawFootnote(doc, M, pageW, innerW, pageH);

  doc.end();
}

// ─── CONSOLIDATED GROUP RECEIPT ────────────────────────────────────────────
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
  registerFonts(doc);
  doc.pipe(res);
  const M = 30,
    pageW = doc.page.width,
    pageH = doc.page.height,
    innerW = pageW - M * 2;

  drawFrame(doc, M, pageW, pageH);
  drawWatermark(doc, pageW, pageH);

  let y = drawHeader(doc, M, pageW, innerW);
  y = drawTitleBanner(
    doc,
    "CONSOLIDATED MAINTENANCE RECEIPT",
    M,
    pageW,
    innerW,
    y
  );
  y = drawMetaRow(
    doc,
    groupReceiptNo,
    payDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    M,
    pageW,
    innerW,
    y
  );

  y = drawFieldRow(
    doc,
    "Received from",
    `${flat.ownerName}  (${flat.flatNumber})`,
    M,
    innerW,
    y,
    { labelW: 130 }
  );
  y = drawFieldRow(
    doc,
    "Mode of payment",
    mode === "ADJUSTMENT" ? "Adjustment / Waiver" : mode,
    M,
    innerW,
    y,
    { labelW: 130 }
  );
  if (paidThrough)
    y = drawFieldRow(doc, "Paid through", paidThrough, M, innerW, y, {
      labelW: 130,
    });
  if (payments[0].note)
    y = drawFieldRow(doc, "Note", payments[0].note, M, innerW, y, {
      labelW: 130,
    });

  y += 6;
  y = drawAmountPanel(doc, totalAmount, M, innerW, y);
  y += 6;

  // Month-wise breakdown table
  doc
    .font("display")
    .fontSize(10.5)
    .fillColor(MAROON_DEEP)
    .text("Month-wise Breakdown", M + 16, y, { characterSpacing: 0.6 });
  y += 20;

  const colX = [M + 16, M + 16 + 130, M + 16 + 270, M + 16 + 390];
  const colW = [130, 140, 120, innerW - 32 - 390];

  doc.rect(M + 16, y, innerW - 32, 20).fill(MAROON);
  doc.font("serifBold").fontSize(9).fillColor(CREAM);
  doc.text("MONTH", colX[0] + 6, y + 5, { width: colW[0] - 6 });
  doc.text("AMOUNT", colX[1], y + 5, { width: colW[1], align: "right" });
  doc.text("MODE", colX[2], y + 5, { width: colW[2] });
  doc.text("STATUS", colX[3], y + 5, { width: colW[3] });
  y += 20;

  const rowH = 19;
  monthPayments.forEach((p, i) => {
    if (i % 2 === 0) doc.rect(M + 16, y, innerW - 32, rowH).fill(CREAM_PANEL);
    doc.font("serif").fontSize(9).fillColor(INK);
    doc.text(p.bill?.month || "—", colX[0] + 6, y + 5, { width: colW[0] - 6 });
    doc.text(`Rs. ${p.amount.toLocaleString("en-IN")}`, colX[1], y + 5, {
      width: colW[1],
      align: "right",
    });
    doc.text(p.mode === "ADJUSTMENT" ? "Waiver" : p.mode, colX[2], y + 5, {
      width: colW[2],
    });
    doc.fillColor(GREEN).text("PAID", colX[3], y + 5, { width: colW[3] });
    y += rowH;
  });

  if (advancePayment) {
    doc.rect(M + 16, y, innerW - 32, rowH).fill(GOLD_SOFT);
    doc.font("serif").fontSize(9).fillColor(INK);
    doc.text("Advance Credit", colX[0] + 6, y + 5, { width: colW[0] - 6 });
    doc.text(
      `Rs. ${advancePayment.amount.toLocaleString("en-IN")}`,
      colX[1],
      y + 5,
      { width: colW[1], align: "right" }
    );
    doc.text(
      advancePayment.mode === "ADJUSTMENT" ? "Waiver" : advancePayment.mode,
      colX[2],
      y + 5,
      { width: colW[2] }
    );
    doc
      .fillColor(MAROON_DEEP)
      .text("CREDITED", colX[3], y + 5, { width: colW[3] });
    y += rowH;
  }

  doc.rect(M + 16, y, innerW - 32, 22).fill(MAROON);
  doc.font("serifBold").fontSize(10).fillColor(CREAM);
  doc.text("TOTAL", colX[0] + 6, y + 6, { width: colW[0] - 6 });
  doc.text(`Rs. ${totalAmount.toLocaleString("en-IN")}`, colX[1], y + 6, {
    width: colW[1],
    align: "right",
  });

  drawSignatureBlock(doc, M, pageW, innerW, pageH - M - 100);
  drawFootnote(doc, M, pageW, innerW, pageH);

  doc.end();
}

module.exports = { downloadReceipt, downloadGroupReceipt };
