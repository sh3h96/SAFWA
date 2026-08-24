const express = require('express');
const router = express.Router();
const requiredPartController = require('../controllers/requiredPartController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createRequiredPartValidation,
  updateApprovalValidation,
  paramIdValidation
} = require('../middleware/validation');

// 1. Get Required Parts Requests List
router.get(
  '/',
  authenticateToken,
  requireRole('mechanic', 'admin', 'super_admin'),
  requiredPartController.getRequests
);

// 2. Submit Required Parts Request (Mechanic / Admin)
router.post(
  '/',
  authenticateToken,
  requireRole('mechanic', 'admin', 'super_admin'),
  createRequiredPartValidation,
  requiredPartController.submitRequest
);

// 3. Batch Update Decisions (Admin / Super Admin ONLY for approval/rejection)
router.put(
  '/approval',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  updateApprovalValidation,
  requiredPartController.updateApproval
);

// 4. Single Approve Required Part (Admin / Super Admin ONLY)
router.put(
  '/:id/approval',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  requiredPartController.approvePart
);

router.post(
  '/:id/approve',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  requiredPartController.approvePart
);

router.put(
  '/:id/approve',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  requiredPartController.approvePart
);

// 5. Single Install Required Part (Mechanic ONLY)
router.put(
  '/:id/installation',
  authenticateToken,
  requireRole('mechanic'),
  paramIdValidation,
  requiredPartController.installPart
);

router.post(
  '/:id/install',
  authenticateToken,
  requireRole('mechanic'),
  paramIdValidation,
  requiredPartController.installPart
);

router.put(
  '/:id/install',
  authenticateToken,
  requireRole('mechanic'),
  paramIdValidation,
  requiredPartController.installPart
);

// 6. Single Reject Required Part (Admin / Super Admin ONLY)
router.put(
  '/:id/rejection',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  requiredPartController.rejectPart
);

router.post(
  '/:id/reject',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  requiredPartController.rejectPart
);

router.put(
  '/:id/reject',
  authenticateToken,
  requireRole('admin', 'super_admin'),
  paramIdValidation,
  requiredPartController.rejectPart
);

// 7. Update Pending Request Quantity (Mechanic ONLY)
router.put(
  '/:id',
  authenticateToken,
  requireRole('mechanic'),
  paramIdValidation,
  requiredPartController.updateRequest
);

// 8. Cancel/Delete Pending Request (Mechanic ONLY)
router.delete(
  '/:id',
  authenticateToken,
  requireRole('mechanic'),
  paramIdValidation,
  requiredPartController.cancelRequest
);

module.exports = router;
