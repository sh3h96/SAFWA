const express = require('express');
const router = express.Router();
const { productValidationRules, validate } = require('../validators/productValidator');

router.post('/', productValidationRules, validate, (req, res) => {
  res.status(200).json({ message: 'تمت العملية بنجاح' });
});

module.exports = router;
