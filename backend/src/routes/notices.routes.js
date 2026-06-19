const express = require('express');
const ctrl = require('../controllers/noticeController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, ctrl.listNotices);
router.post('/', authRequired, adminOnly, ctrl.createNotice);
router.delete('/:id', authRequired, adminOnly, ctrl.deleteNotice);

module.exports = router;
