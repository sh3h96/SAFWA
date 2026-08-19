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
  resetPasswordValidation,
  updateProfileValidation,
  changePasswordValidation
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

// Protected User & Profile routes
router.post('/logout', authenticateToken, userController.logout);
router.get('/me', authenticateToken, userController.getMe);
router.put('/profile', authenticateToken, updateProfileValidation, userController.updateProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, userController.changePassword);
router.get('/staff-highlights', authenticateToken, userController.getStaffHighlights);

// Administrative User routes (RBAC Restricted)
router.get('/', authenticateToken, requireRole('admin'), userController.getAllUsers);
router.post('/', authenticateToken, requireRole('admin'), createUserValidation, userController.createUser);
router.put('/:id/status', authenticateToken, requireRole('admin'), paramIdValidation, userController.updateUserStatus);
router.get('/:id', authenticateToken, paramIdValidation, userController.getUserById);
router.put('/:id', authenticateToken, requireRole('admin'), updateUserValidation, userController.updateUser);

module.exports = router;
