const express = require("express");
const ctrl = require("../controllers/expenseController");
const { createContribution } = require("../controllers/contributionController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, ctrl.listExpenses);
router.post("/", authRequired, adminOnly, ctrl.createExpense);
router.post("/contribution", authRequired, adminOnly, createContribution);
router.put("/:id", authRequired, adminOnly, ctrl.updateExpense);
router.delete("/:id", authRequired, adminOnly, ctrl.deleteExpense);

module.exports = router;
