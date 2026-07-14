const express = require("express");
const { duesDashboard, duesMatrix } = require("../controllers/dueController");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, duesDashboard);
router.get("/matrix", authRequired, duesMatrix);

module.exports = router;
