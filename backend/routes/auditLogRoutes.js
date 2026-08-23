'use strict';

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// IMMUTABLE AUDIT LOG API: Read-Only endpoint strictly restricted to Super Admin
router.get('/', authenticateToken, requireRole('super_admin'), auditLogController.getAuditLogs);

module.exports = router;
