const express = require('express');
const router = express.Router();
const newPartRequestController = require('../controllers/newPartRequestController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { paramIdValidation } = require('../middleware/validation');

// 1. Create New Part Request (Mechanic / Admin)
router.post(
  '/',
  authenticateToken,
  requireRole('mechanic', 'admin', 'super_admin'),
  newPartRequestController.createRequest
);

// 2. List New Part Requests (Mechanic / Admin)
router.get(
  '/',
  authenticateToken,
  requireRole('mechanic', 'admin', 'super_admin'),
  newPartRequestController.getAllRequests
);

// 3. Get Request Details
router.get(
  '/:id',
  authenticateToken,
  requireRole('client', 'mechanic', 'admin', 'super_admin'),
  paramIdValidation,
  newPartRequestController.getRequestById
);

// 4. Approve Request (Admin / Super Admin ONLY)
router.put(
  '/:id/approval',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  newPartRequestController.approveRequest
);

router.post(
  '/:id/approve',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  newPartRequestController.approveRequest
);

router.put(
  '/:id/approve',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  newPartRequestController.approveRequest
);

// 5. Reject Request (Admin / Super Admin ONLY)
router.put(
  '/:id/rejection',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  newPartRequestController.rejectRequest
);

router.post(
  '/:id/reject',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  newPartRequestController.rejectRequest
);

router.put(
  '/:id/reject',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  newPartRequestController.rejectRequest
);

module.exports = router;
