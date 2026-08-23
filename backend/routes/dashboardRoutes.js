const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Dashboard routes (Restricted to Admin & Super Admin)
router.get('/metrics', authenticateToken, requireRole('admin'), dashboardController.getMetrics);
router.get('/charts', authenticateToken, requireRole('admin'), dashboardController.getCharts);
router.get('/work-orders', authenticateToken, requireRole('admin'), dashboardController.getWorkOrders);

module.exports = router;
