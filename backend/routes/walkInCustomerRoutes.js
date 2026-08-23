'use strict';

const express = require('express');
const router = express.Router();
const walkInController = require('../controllers/walkInController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createWalkInCustomerValidation,
  resolveMatchValidation,
  paramIdValidation
} = require('../middleware/validation');

const adminAuth = [authenticateToken, requireRole('admin', 'super_admin')];

router.get('/search', adminAuth, walkInController.searchCustomers);
router.post('/match', adminAuth, walkInController.matchCustomer);
router.post('/resolve-match', adminAuth, resolveMatchValidation, walkInController.resolveMatch);
router.post('/resolve', adminAuth, resolveMatchValidation, walkInController.resolveMatch);
router.post('/with-visit', adminAuth, createWalkInCustomerValidation, walkInController.createCustomerWithVisit);
router.post('/', adminAuth, createWalkInCustomerValidation, walkInController.createCustomerWithVisit);
router.get('/:id/history', adminAuth, paramIdValidation, walkInController.getCustomerHistory);
router.get('/:id', adminAuth, paramIdValidation, walkInController.getCustomer);
router.put('/:id', adminAuth, paramIdValidation, walkInController.updateCustomer);
router.get('/', adminAuth, walkInController.listCustomers);

module.exports = router;
