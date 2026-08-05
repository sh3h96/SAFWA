const express = require('express');
const router = express.Router();
const requiredPartController = require('../controllers/requiredPartController');

const auth = require('../middleware/auth');

router.post('/', auth, requiredPartController.submitRequest);
router.put('/approval', auth, requiredPartController.updateApproval);

module.exports = router;
