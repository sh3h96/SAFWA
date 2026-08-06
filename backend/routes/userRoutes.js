const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Auth routes (Usually you might have a separate authRoutes.js, but keeping it simple here)
router.post('/login', userController.login);
router.post('/register', userController.register);

// Protected User routes
router.get('/me', auth, userController.getMe);
router.get('/', auth, userController.getAllUsers);
router.post('/', auth, userController.createUser);
router.get('/staff-highlights', auth, userController.getStaffHighlights);
router.put('/:id', auth, userController.updateUser);
router.put('/:id/status', auth, userController.updateUserStatus);

module.exports = router;
