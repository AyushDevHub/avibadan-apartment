const express = require("express");
const ctrl = require("../controllers/memberLedgerController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

// All logged-in users can view (residents see their own collector's ledger)
router.get("/", authRequired, ctrl.getAllMemberLedgers);
router.get("/:flatId", authRequired, ctrl.getMemberLedger);

// Only admin can add/delete entries
router.post("/", authRequired, adminOnly, ctrl.addEntry);
router.delete("/:id", authRequired, adminOnly, ctrl.deleteEntry);

module.exports = router;
