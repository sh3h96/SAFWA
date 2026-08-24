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
router.put('/:id/stock', authenticateToken, requireRole('admin', 'super_admin'), sparePartController.adjustStock);
router.put('/:id', authenticateToken, requireRole('admin', 'super_admin'), updateSparePartValidation, sparePartController.updatePart);
router.delete('/:id', authenticateToken, requireRole('admin', 'super_admin'), sparePartController.deletePart);

module.exports = router;
