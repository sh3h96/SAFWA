const express = require('express');
const router = express.Router();
const technicalReportController = require('../controllers/technicalReportController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Protected Technical Report routes (RBAC Restricted)
router.post('/', authenticateToken, requireRole('mechanic', 'admin'), technicalReportController.createReport);

module.exports = router;
