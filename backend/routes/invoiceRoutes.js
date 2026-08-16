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
router.get('/reports', authenticateToken, requireRole('admin', 'receptionist'), invoiceController.getPendingReports);
router.post('/issue', authenticateToken, requireRole('admin', 'receptionist'), issueInvoiceValidation, invoiceController.issueInvoice);
router.get('/:id', authenticateToken, requireRole('admin', 'receptionist', 'client'), paramIdValidation, invoiceController.getInvoice);
router.post('/:id/pay', authenticateToken, requireRole('admin', 'receptionist', 'client'), payInvoiceValidation, invoiceController.payInvoice);

module.exports = router;
