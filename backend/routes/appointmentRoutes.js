const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createAppointmentValidation,
  updateAppointmentValidation,
  paramIdValidation
} = require('../middleware/validation');

// Public slots route
router.get('/slots', appointmentController.getAvailableSlots);

// Protected Appointment routes (RBAC Restricted)
router.post('/', authenticateToken, requireRole('client', 'admin'), createAppointmentValidation, appointmentController.createAppointment);
router.get('/my', authenticateToken, requireRole('client'), appointmentController.getMyAppointments);
router.get('/assigned', authenticateToken, requireRole('mechanic'), appointmentController.getAssignedTasks);
router.get('/', authenticateToken, requireRole('admin'), appointmentController.getAllAppointments);
router.get('/:id', authenticateToken, requireRole('admin', 'mechanic', 'client'), paramIdValidation, appointmentController.getAppointmentById);
router.put('/:id', authenticateToken, requireRole('admin', 'mechanic'), updateAppointmentValidation, appointmentController.updateAppointment);

module.exports = router;
