const express = require('express');
const { duesDashboard } = require('../controllers/dueController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, duesDashboard);

module.exports = router;
