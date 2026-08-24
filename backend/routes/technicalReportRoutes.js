const express = require('express');
const router = express.Router();
const technicalReportController = require('../controllers/technicalReportController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createTechnicalReportValidation,
  updateTechnicalReportValidation,
  paramIdValidation
} = require('../middleware/validation');

// Protected Technical Report routes (RBAC Restricted)
router.post(
  '/',
  authenticateToken,
  requireRole('mechanic', 'admin', 'super_admin'),
  createTechnicalReportValidation,
  technicalReportController.createReport
);

router.get(
  '/appointment/:appointmentId',
  authenticateToken,
  requireRole('client', 'mechanic', 'admin', 'super_admin'),
  technicalReportController.getReportByAppointment
);

router.get(
  '/:id',
  authenticateToken,
  requireRole('client', 'mechanic', 'admin', 'super_admin'),
  paramIdValidation,
  technicalReportController.getReportById
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('mechanic', 'admin', 'super_admin'),
  updateTechnicalReportValidation,
  technicalReportController.updateReport
);

module.exports = router;
