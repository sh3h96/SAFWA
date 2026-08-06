const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const auth = require('../middleware/auth');

router.get('/my', auth, invoiceController.getMyInvoices);
router.get('/reports', auth, invoiceController.getPendingReports);
router.post('/issue', auth, invoiceController.issueInvoice);
router.get('/:id', auth, invoiceController.getInvoice);
router.post('/:id/pay', auth, invoiceController.payInvoice);

module.exports = router;
