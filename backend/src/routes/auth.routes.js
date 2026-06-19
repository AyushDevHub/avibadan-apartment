const express = require('express');
const { login, me, createResidentUser, listFlatUsers } = require('../controllers/authController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', authRequired, me);
router.post('/residents', authRequired, adminOnly, createResidentUser);
router.get('/residents/:flatId', authRequired, adminOnly, listFlatUsers);

module.exports = router;
