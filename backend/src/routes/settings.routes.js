const express = require("express");
const ctrl = require("../controllers/settingsController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

// Everyone logged in (residents included) can read settings — they need the
// QR code to pay. Only admin can change it.
router.get("/", authRequired, ctrl.getSettings);
router.patch("/", authRequired, adminOnly, ctrl.updateSettings);

module.exports = router;
