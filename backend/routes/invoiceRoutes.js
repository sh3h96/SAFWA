const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Protected Invoice routes (RBAC Restricted)
router.get('/my', authenticateToken, requireRole('client'), invoiceController.getMyInvoices);
router.get('/reports', authenticateToken, requireRole('admin', 'receptionist'), invoiceController.getPendingReports);
router.post('/issue', authenticateToken, requireRole('admin', 'receptionist'), invoiceController.issueInvoice);
router.get('/:id', authenticateToken, requireRole('admin', 'receptionist', 'client'), invoiceController.getInvoice);
router.post('/:id/pay', authenticateToken, requireRole('admin', 'receptionist', 'client'), invoiceController.payInvoice);

module.exports = router;
