const express = require('express');
const ctrl = require('../controllers/flatController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, ctrl.listFlats);
router.get('/:id', authRequired, ctrl.getFlat);
router.post('/', authRequired, adminOnly, ctrl.createFlat);
router.put('/:id', authRequired, adminOnly, ctrl.updateFlat);
router.delete('/:id', authRequired, adminOnly, ctrl.deleteFlat);

module.exports = router;
