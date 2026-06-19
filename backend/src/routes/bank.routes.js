const express = require('express');
const ctrl = require('../controllers/bankController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, ctrl.listBankLedger);
router.post('/', authRequired, adminOnly, ctrl.addBankTransaction);

module.exports = router;
