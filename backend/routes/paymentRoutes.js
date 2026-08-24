'use strict';

const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Direct payment recording route
router.post('/', authenticateToken, requireRole('admin', 'super_admin'), (req, res, next) => {
  if (req.body.invoice_id) {
    req.params.id = req.body.invoice_id;
  }
  invoiceController.payInvoice(req, res, next);
});

module.exports = router;
