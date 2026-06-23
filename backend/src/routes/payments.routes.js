const express = require("express");
const ctrl = require("../controllers/paymentController");
const { createBulkPayment } = require("../controllers/bulkPaymentController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, ctrl.listPayments);
router.get("/:id", authRequired, ctrl.getPayment);
router.post("/", authRequired, adminOnly, ctrl.createPayment);
router.post("/bulk", authRequired, adminOnly, createBulkPayment);
router.delete("/:id", authRequired, adminOnly, ctrl.deletePayment);

module.exports = router;
