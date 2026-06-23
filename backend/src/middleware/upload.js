const multer = require("multer");

const storage = multer.memoryStorage();

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
  else
    cb(new Error("Only JPG, PNG, WEBP, HEIC images or PDF files are allowed"));
}

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB - plenty for a photographed bill
  fileFilter,
});

module.exports = upload;
