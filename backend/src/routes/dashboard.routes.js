const express = require('express');
const { dashboardSummary, fundStatus } = require('../controllers/dashboardController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Full dashboard (charts, due distribution, recent transactions) - admin only
router.get('/', authRequired, adminOnly, dashboardSummary);

// Cash in hand + bank balance only - visible to every logged-in user
router.get('/fund-status', authRequired, fundStatus);

module.exports = router;
