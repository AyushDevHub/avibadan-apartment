const express = require('express');
const ctrl = require('../controllers/billController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, ctrl.listBills);
router.post('/generate', authRequired, adminOnly, ctrl.generateBills);
router.put('/:id', authRequired, adminOnly, ctrl.updateBill);
router.put('/:id/waive', authRequired, adminOnly, ctrl.waiveBill);

module.exports = router;
