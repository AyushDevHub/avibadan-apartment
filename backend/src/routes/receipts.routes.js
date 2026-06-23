const express = require("express");
const {
  downloadReceipt,
  downloadGroupReceipt,
} = require("../controllers/receiptController");

const router = express.Router();

// Both intentionally public - the link itself is the access control.
router.get("/group/:groupNo", downloadGroupReceipt);
router.get("/:id", downloadReceipt);

module.exports = router;
