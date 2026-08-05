const express = require('express');
const router = express.Router();
const technicalReportController = require('../controllers/technicalReportController');

const auth = require('../middleware/auth');

router.post('/', auth, technicalReportController.createReport);

module.exports = router;
