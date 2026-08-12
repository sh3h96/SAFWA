const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Protected Review routes (RBAC Restricted)
router.get('/', authenticateToken, reviewController.getAllReviews);
router.post('/', authenticateToken, requireRole('client'), reviewController.createReview);

module.exports = router;
