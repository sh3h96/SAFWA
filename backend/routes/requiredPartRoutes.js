const express = require('express');
const router = express.Router();
const requiredPartController = require('../controllers/requiredPartController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createRequiredPartValidation,
  updateApprovalValidation
} = require('../middleware/validation');

// Protected Required Parts routes (RBAC Restricted)
router.get('/', authenticateToken, requireRole('mechanic', 'admin'), requiredPartController.getRequests);
router.post('/', authenticateToken, requireRole('mechanic', 'admin'), createRequiredPartValidation, requiredPartController.submitRequest);
router.put('/approval', authenticateToken, requireRole('admin'), updateApprovalValidation, requiredPartController.updateApproval);

module.exports = router;
