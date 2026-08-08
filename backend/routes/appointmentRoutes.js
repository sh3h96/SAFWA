const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const auth = require('../middleware/auth');

router.get('/slots', appointmentController.getAvailableSlots);
router.post('/', auth, appointmentController.createAppointment);
router.get('/my', auth, appointmentController.getMyAppointments);
router.get('/assigned', auth, appointmentController.getAssignedTasks);
router.get('/', auth, appointmentController.getAllAppointments);
router.get('/:id', auth, appointmentController.getAppointmentById);
router.put('/:id', auth, appointmentController.updateAppointment);

module.exports = router;
