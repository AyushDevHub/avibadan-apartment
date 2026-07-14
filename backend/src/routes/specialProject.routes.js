const express = require("express");
const ctrl = require("../controllers/specialProjectController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

// Everyone logged in can view (residents can see their own share/dues)
router.get("/", authRequired, ctrl.listProjects);
router.get("/:id", authRequired, ctrl.getProject);

// Only admin can manage projects
router.post("/", authRequired, adminOnly, ctrl.createProject);
router.patch("/:id", authRequired, adminOnly, ctrl.updateProject);
router.delete("/:id", authRequired, adminOnly, ctrl.deleteProject);
router.patch("/:id/status", authRequired, adminOnly, ctrl.updateProjectStatus);
router.post("/:id/close", authRequired, adminOnly, ctrl.closeProject);

router.post("/:id/payments", authRequired, adminOnly, ctrl.addPayment);
router.delete(
  "/:id/payments/:paymentId",
  authRequired,
  adminOnly,
  ctrl.deletePayment
);

router.post("/:id/expenses", authRequired, adminOnly, ctrl.addExpense);
router.delete(
  "/:id/expenses/:expenseId",
  authRequired,
  adminOnly,
  ctrl.deleteExpense
);

module.exports = router;
