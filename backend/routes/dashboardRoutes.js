const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.get('/metrics', auth, dashboardController.getMetrics);
router.get('/charts', auth, dashboardController.getCharts);
router.get('/work-orders', auth, dashboardController.getWorkOrders);

module.exports = router;
