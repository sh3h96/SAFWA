const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public Auth routes
router.post('/login', userController.login);
router.post('/register', userController.register);

// Protected User routes
router.get('/me', authenticateToken, userController.getMe);
router.get('/staff-highlights', authenticateToken, userController.getStaffHighlights);

// Administrative User routes (RBAC Restricted)
router.get('/', authenticateToken, requireRole('admin', 'receptionist'), userController.getAllUsers);
router.post('/', authenticateToken, requireRole('admin'), userController.createUser);
router.put('/:id', authenticateToken, requireRole('admin'), userController.updateUser);
router.put('/:id/status', authenticateToken, requireRole('admin'), userController.updateUserStatus);

module.exports = router;
