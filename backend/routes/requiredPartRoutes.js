const express = require('express');
const router = express.Router();
const requiredPartController = require('../controllers/requiredPartController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Protected Required Parts routes (RBAC Restricted)
router.post('/', authenticateToken, requireRole('mechanic', 'admin'), requiredPartController.submitRequest);
router.put('/approval', authenticateToken, requireRole('admin', 'receptionist'), requiredPartController.updateApproval);

module.exports = router;
