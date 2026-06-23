const express = require("express");
const { resetTransactions } = require("../controllers/adminController");
const { authRequired, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.post("/reset-transactions", authRequired, adminOnly, resetTransactions);

module.exports = router;
