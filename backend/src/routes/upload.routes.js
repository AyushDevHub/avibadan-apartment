const express = require("express");
const upload = require("../middleware/upload");
const { uploadBillFile } = require("../controllers/uploadController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/bill",
  authRequired,
  adminOnly,
  upload.single("file"),
  uploadBillFile
);

module.exports = router;
