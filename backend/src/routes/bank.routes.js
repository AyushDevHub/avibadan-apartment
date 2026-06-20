const express = require("express");
const ctrl = require("../controllers/bankController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, ctrl.listBankLedger);
router.post("/", authRequired, adminOnly, ctrl.addBankTransaction);
router.put("/:id", authRequired, adminOnly, ctrl.updateBankTransaction);
router.delete("/:id", authRequired, adminOnly, ctrl.deleteBankTransaction);

module.exports = router;
