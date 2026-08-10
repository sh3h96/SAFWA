const express = require('express');
const router = express.Router();
const sparePartController = require('../controllers/sparePartController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Inventory / Spare Parts routes (RBAC Restricted)
router.get('/', authenticateToken, requireRole('admin', 'receptionist', 'mechanic'), sparePartController.getAllParts);
router.post('/', authenticateToken, requireRole('admin'), sparePartController.addPart);
router.put('/:id', authenticateToken, requireRole('admin'), sparePartController.updatePart);

module.exports = router;
