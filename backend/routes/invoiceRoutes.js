'use strict';

const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  issueInvoiceValidation,
  payInvoiceValidation,
  paramIdValidation
} = require('../middleware/validation');

// Protected Invoice routes (RBAC Restricted)
router.get('/my', authenticateToken, requireRole('client'), invoiceController.getMyInvoices);
router.get('/reports', authenticateToken, requireRole('admin', 'super_admin'), invoiceController.getPendingReports);
router.get('/financial-summary', authenticateToken, requireRole('admin', 'super_admin'), invoiceController.getFinancialSummary);

// Issue Invoice Endpoints
router.post('/issue', authenticateToken, requireRole('admin', 'super_admin'), issueInvoiceValidation, invoiceController.issueInvoice);
router.post('/', authenticateToken, requireRole('admin', 'super_admin'), issueInvoiceValidation, invoiceController.issueInvoice);

// Invoice Detail
router.get('/:id', authenticateToken, requireRole('admin', 'super_admin', 'client'), paramIdValidation, invoiceController.getInvoice);

// Payment Recording Endpoints
router.post('/:id/pay', authenticateToken, requireRole('admin', 'super_admin', 'client'), payInvoiceValidation, invoiceController.payInvoice);
router.post('/:id/payments', authenticateToken, requireRole('admin', 'super_admin', 'client'), payInvoiceValidation, invoiceController.payInvoice);
router.get('/:id/payments', authenticateToken, requireRole('admin', 'super_admin', 'client'), paramIdValidation, invoiceController.getInvoicePayments);

module.exports = router;
