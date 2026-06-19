const express = require('express');
const ctrl = require('../controllers/complaintController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, ctrl.listComplaints);
router.post('/', authRequired, ctrl.createComplaint);
router.put('/:id/status', authRequired, adminOnly, ctrl.updateComplaintStatus);

module.exports = router;
