const express = require('express');
const ctrl = require('../controllers/reportController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/monthly', authRequired, adminOnly, ctrl.monthlyReport);
router.get('/annual', authRequired, adminOnly, ctrl.annualReport);
router.get('/export/monthly', authRequired, adminOnly, ctrl.exportMonthlyCsv);

module.exports = router;
