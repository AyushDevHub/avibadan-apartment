const express = require('express');
const { home, transparency } = require('../controllers/publicController');

const router = express.Router();

router.get('/home', home);
router.get('/transparency', transparency);

module.exports = router;
