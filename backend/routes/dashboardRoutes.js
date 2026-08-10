const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Dashboard routes (Restricted to Admin & Receptionist)
router.get('/metrics', authenticateToken, requireRole('admin', 'receptionist'), dashboardController.getMetrics);
router.get('/charts', authenticateToken, requireRole('admin', 'receptionist'), dashboardController.getCharts);
router.get('/work-orders', authenticateToken, requireRole('admin', 'receptionist'), dashboardController.getWorkOrders);

module.exports = router;
