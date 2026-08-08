const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');

router.get('/dashboard', auth, customerController.getDashboard);

module.exports = router;
