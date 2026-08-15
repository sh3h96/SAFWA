const express = require('express');
const router = express.Router();
const technicalReportController = require('../controllers/technicalReportController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createTechnicalReportValidation } = require('../middleware/validation');

// Protected Technical Report routes (RBAC Restricted)
router.post('/', authenticateToken, requireRole('mechanic', 'admin'), createTechnicalReportValidation, technicalReportController.createReport);

module.exports = router;
