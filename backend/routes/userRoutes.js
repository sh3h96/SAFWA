const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  createUserValidation,
  updateUserValidation,
  paramIdValidation,
  resendVerificationValidation,
  verifyEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../middleware/validation');

// Public Auth routes
router.post('/login', loginValidation, userController.login);
router.post('/register', registerValidation, userController.register);

// Email Verification & Password Reset routes (Public)
router.get('/verify-email', verifyEmailValidation, userController.verifyEmail);
router.post('/verify-email', verifyEmailValidation, userController.verifyEmail);
router.post('/resend-verification', resendVerificationValidation, userController.resendVerification);
router.post('/forgot-password', forgotPasswordValidation, userController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, userController.resetPassword);

// Protected User routes
router.post('/logout', authenticateToken, userController.logout);
router.get('/me', authenticateToken, userController.getMe);
router.get('/staff-highlights', authenticateToken, userController.getStaffHighlights);

// Administrative User routes (RBAC Restricted)
router.get('/', authenticateToken, requireRole('admin'), userController.getAllUsers);
router.post('/', authenticateToken, requireRole('admin'), createUserValidation, userController.createUser);
router.put('/:id', authenticateToken, requireRole('admin'), updateUserValidation, userController.updateUser);
router.put('/:id/status', authenticateToken, requireRole('admin'), paramIdValidation, userController.updateUserStatus);

module.exports = router;
