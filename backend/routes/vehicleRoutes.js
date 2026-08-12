const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Protected Vehicle routes (RBAC Restricted)
router.get('/', authenticateToken, requireRole('admin', 'receptionist'), vehicleController.getAllVehicles);
router.get('/my', authenticateToken, requireRole('client'), vehicleController.getMyVehicles);
router.post('/', authenticateToken, requireRole('client', 'admin', 'receptionist'), vehicleController.createVehicle);
router.put('/:id', authenticateToken, requireRole('admin', 'receptionist', 'client'), vehicleController.updateVehicle);
router.get('/:id/history', authenticateToken, requireRole('admin', 'receptionist', 'mechanic', 'client'), vehicleController.getVehicleHistory);

module.exports = router;
