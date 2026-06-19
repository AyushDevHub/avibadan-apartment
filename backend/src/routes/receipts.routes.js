const express = require('express');
const { downloadReceipt } = require('../controllers/receiptController');

const router = express.Router();

// Intentionally public: the link itself (with its unguessable payment ID)
// is what you share with the flat owner as their receipt - no login needed.
router.get('/:id', downloadReceipt);

module.exports = router;
