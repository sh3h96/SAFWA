const express = require('express');
const router = express.Router();
const sparePartController = require('../controllers/sparePartController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createSparePartValidation,
  updateSparePartValidation
} = require('../middleware/validation');

// Inventory / Spare Parts routes (RBAC Restricted)
router.get('/', authenticateToken, requireRole('admin', 'mechanic'), sparePartController.getAllParts);
router.post('/', authenticateToken, requireRole('admin'), createSparePartValidation, sparePartController.addPart);
router.put('/:id', authenticateToken, requireRole('admin'), updateSparePartValidation, sparePartController.updatePart);

module.exports = router;
