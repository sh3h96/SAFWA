const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createVehicleValidation,
  updateVehicleValidation,
  paramIdValidation
} = require('../middleware/validation');

// Protected Vehicle routes (RBAC Restricted)
router.get('/', authenticateToken, requireRole('admin', 'receptionist'), vehicleController.getAllVehicles);
router.get('/my', authenticateToken, requireRole('client'), vehicleController.getMyVehicles);
router.post('/', authenticateToken, requireRole('client', 'admin', 'receptionist'), createVehicleValidation, vehicleController.createVehicle);
router.put('/:id', authenticateToken, requireRole('admin', 'receptionist', 'client'), updateVehicleValidation, vehicleController.updateVehicle);
router.get('/:id/history', authenticateToken, requireRole('admin', 'receptionist', 'mechanic', 'client'), paramIdValidation, vehicleController.getVehicleHistory);

module.exports = router;
