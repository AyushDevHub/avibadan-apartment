const express = require('express');
const ctrl = require('../controllers/cashbookController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, ctrl.listCashLedger);
router.post('/manual', authRequired, adminOnly, ctrl.addManualEntry);

module.exports = router;
