const { body, validationResult } = require('express-validator');

const productValidationRules = [
  body('name').notEmpty().withMessage('اسم المنتج مطلوب'),
  body('price').isNumeric().withMessage('السعر يجب أن يكون رقماً')
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(422).json({ errors: errors.array() });
};

module.exports = { productValidationRules, validate };
