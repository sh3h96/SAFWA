'use strict';

const express = require('express');
const router = express.Router();
const walkInController = require('../controllers/walkInController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createWalkInVisitValidation,
  paramIdValidation
} = require('../middleware/validation');

const adminAuth = [authenticateToken, requireRole('admin', 'super_admin')];

router.post('/', adminAuth, createWalkInVisitValidation, walkInController.createVisit);
router.get('/:id', adminAuth, paramIdValidation, walkInController.getVisit);
router.put('/:id', adminAuth, paramIdValidation, walkInController.updateVisit);

module.exports = router;
