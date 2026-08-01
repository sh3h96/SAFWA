const { body, validationResult } = require('express-validator');

const storeProductRules = [
  body('name')
    .notEmpty().withMessage('اسم المنتج مطلوب')
    .isString().withMessage('اسم المنتج يجب أن يكون نصاً')
    .isLength({ min: 3 }).withMessage('اسم المنتج يجب ألا يقل عن 3 أحرف'),

  body('category_id')
    .notEmpty().withMessage('حقل القسم مطلوب')
    .isInt().withMessage('رمز القسم يجب أن يكون رقماً صحبحاً'),

  body('price')
    .notEmpty().withMessage('يرجى تحديد السعر')
    .isNumeric().withMessage('يجب أن يكون السعر رقماً')
    .custom(val => val >= 0).withMessage('السعر يجب أن يكون 0 أو أكثر'),

  body('stock')
    .notEmpty().withMessage('يرجى تحديد الكمية المتاحة')
    .isInt({ min: 0 }).withMessage('الكمية يجب أن تكون رقماً صحبحاً ولا تقل عن 0'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 'error',
      message: 'البيانات المدخلة غير صالحة',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  storeProductRules,
  validate
};
