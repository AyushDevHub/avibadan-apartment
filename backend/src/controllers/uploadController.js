const cloudinary = require("../config/cloudinary");

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Uploads a photographed/scanned bill (electricity bill, repair invoice, etc.)
// and returns a permanent URL. Used by the Expenses page and the Resident
// Contribution form - the returned URL gets saved as Expense.billUpload,
// which is then visible to everyone on the public Transparency page.
async function uploadBillFile(req, res) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const isPdf = req.file.mimetype === "application/pdf";
    const result = await uploadBuffer(req.file.buffer, {
      folder: "avibadan-bills",
      resource_type: isPdf ? "raw" : "image",
    });
    res.status(201).json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ message: "Upload failed: " + err.message });
  }
}

module.exports = { uploadBillFile };
