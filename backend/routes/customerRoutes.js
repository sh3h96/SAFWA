const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Protected Customer routes (RBAC Restricted)
router.get('/dashboard', authenticateToken, requireRole('client'), customerController.getDashboard);

module.exports = router;
