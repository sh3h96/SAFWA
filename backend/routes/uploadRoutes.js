'use strict';

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');
const { handleSingleImageUpload } = require('../middleware/uploadMiddleware');

// POST /api/uploads/image
router.post('/image', authenticateToken, handleSingleImageUpload, uploadController.uploadImage);

// DELETE /api/uploads/image
router.delete('/image', authenticateToken, uploadController.deleteImage);

module.exports = router;
