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
router.get('/reports', authenticateToken, requireRole('admin'), invoiceController.getPendingReports);
router.post('/issue', authenticateToken, requireRole('admin'), issueInvoiceValidation, invoiceController.issueInvoice);
router.get('/:id', authenticateToken, requireRole('admin', 'client'), paramIdValidation, invoiceController.getInvoice);
router.post('/:id/pay', authenticateToken, requireRole('admin', 'client'), payInvoiceValidation, invoiceController.payInvoice);

module.exports = router;
