const express = require("express");
const ctrl = require("../controllers/paymentController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, ctrl.listPayments);
router.get("/:id", authRequired, ctrl.getPayment);
router.post("/", authRequired, adminOnly, ctrl.createPayment);
router.delete("/:id", authRequired, adminOnly, ctrl.deletePayment);

module.exports = router;
