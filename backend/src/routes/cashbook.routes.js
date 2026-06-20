const express = require("express");
const ctrl = require("../controllers/cashbookController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, ctrl.listCashLedger);
router.post("/manual", authRequired, adminOnly, ctrl.addManualEntry);
router.put("/manual/:id", authRequired, adminOnly, ctrl.updateManualEntry);
router.delete("/manual/:id", authRequired, adminOnly, ctrl.deleteManualEntry);

module.exports = router;
