'use strict';

const express = require('express');
const router = express.Router();
const walkInController = require('../controllers/walkInController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  createWalkInCustomerValidation,
  createWalkInVisitValidation,
  resolveMatchValidation,
  paramIdValidation
} = require('../middleware/validation');

// All Walk-in management endpoints are strictly RBAC protected (admin / super_admin)
const adminAuth = [authenticateToken, requireRole('admin', 'super_admin')];

// Walk-in Customer endpoints
router.get('/customers/search', adminAuth, walkInController.searchCustomers);
router.get('/customers', adminAuth, walkInController.listCustomers);
router.post('/customers/match', adminAuth, walkInController.matchCustomer);
router.post('/customers/resolve-match', adminAuth, resolveMatchValidation, walkInController.resolveMatch);
router.post('/customers/with-visit', adminAuth, walkInController.createCustomerWithVisit);
router.post('/customers', adminAuth, createWalkInCustomerValidation, walkInController.createCustomerWithVisit);
router.get('/customers/:id/history', adminAuth, paramIdValidation, walkInController.getCustomerHistory);
router.get('/customers/:id', adminAuth, paramIdValidation, walkInController.getCustomer);
router.put('/customers/:id', adminAuth, paramIdValidation, walkInController.updateCustomer);

// Walk-in Visit endpoints
router.post('/visits', adminAuth, createWalkInVisitValidation, walkInController.createVisit);
router.get('/visits/:id', adminAuth, paramIdValidation, walkInController.getVisit);
router.put('/visits/:id', adminAuth, paramIdValidation, walkInController.updateVisit);

module.exports = router;
