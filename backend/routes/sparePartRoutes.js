const express = require('express');
const router = express.Router();
const sparePartController = require('../controllers/sparePartController');
const auth = require('../middleware/auth');

router.get('/', auth, sparePartController.getAllParts);
router.post('/', auth, sparePartController.addPart);
router.put('/:id', auth, sparePartController.updatePart);

module.exports = router;
