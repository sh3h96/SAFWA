const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middleware/auth');

router.get('/', auth, vehicleController.getAllVehicles);
router.get('/my', auth, vehicleController.getMyVehicles);
router.post('/', auth, vehicleController.createVehicle);
router.put('/:id', auth, vehicleController.updateVehicle);
router.get('/:id/history', auth, vehicleController.getVehicleHistory);

module.exports = router;
