const express = require('express');
const ctrl = require('../controllers/staffController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, ctrl.listStaff);
router.post('/', authRequired, adminOnly, ctrl.createStaff);
router.put('/:id', authRequired, adminOnly, ctrl.updateStaff);
router.post('/:id/pay', authRequired, adminOnly, ctrl.paySalary);

module.exports = router;
