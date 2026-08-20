const { validationResult, body, param, query } = require('express-validator');

// Helper middleware to execute rules and handle validation result consistently
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const formattedErrors = errors.array().map(err => ({
    field: err.path || err.param,
    message: err.msg
  }));

  const mainMessage = formattedErrors.length > 0 ? formattedErrors[0].message : 'بيانات غير صالحة';

  return res.status(400).json({
    message: mainMessage,
    errors: formattedErrors
  });
};

const VALID_ROLES = ['super_admin', 'admin', 'mechanic', 'client'];
const VALID_APPOINTMENT_STATUSES = ['pending', 'awaiting_assignment', 'under_inspection', 'in_progress', 'waiting_parts', 'ready_for_pickup', 'completed', 'cancelled'];
const VALID_PART_APPROVAL_STATUSES = ['approved', 'rejected', 'installed', 'pending'];
const VALID_PAYMENT_METHODS = ['cash', 'card', 'credit_card', 'online', 'bank_transfer'];

const YEMENI_PHONE_REGEX = /^7\d{8}$/;

// 1. Auth Validation Rules
const registerValidation = [
  body().custom((val, { req }) => {
    const nameVal = req.body.fullName || req.body.name;
    if (!nameVal || typeof nameVal !== 'string' || !nameVal.trim()) {
      throw new Error('الاسم الكامل مطلوب');
    }
    if (nameVal.trim().length < 2 || nameVal.trim().length > 100) {
      throw new Error('الاسم يجب أن يكون بين حرفين و 100 حرف');
    }
    return true;
  }),
  body('email')
    .trim()
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('يرجى إدخال بريد إلكتروني صالح')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty().withMessage('رقم الجوال مطلوب')
    .custom((val) => {
      const cleanVal = (val || '').trim();
      if (!YEMENI_PHONE_REGEX.test(cleanVal)) {
        throw new Error('يرجى إدخال رقم صحيح مكون من تسعة أرقام فقط.');
      }
      return true;
    }),
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
    .isLength({ min: 6 }).withMessage('كلمة المرور يجب أن لا تقل عن 6 أحرف'),
  handleValidation
];

const loginValidation = [
  body().custom((val, { req }) => {
    const rawInput = req.body.email || req.body.contact || req.body.identifier || req.body.phone;
    if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
      throw new Error('يرجى إدخال البريد الإلكتروني أو رقم الجوال');
    }
    const input = rawInput.trim();
    if (input.includes('@')) {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      if (!isEmail) {
        throw new Error('يرجى إدخال بريد إلكتروني صالح');
      }
      return true;
    }
    if (!YEMENI_PHONE_REGEX.test(input)) {
      throw new Error('يرجى إدخال رقم صحيح مكون من تسعة أرقام فقط.');
    }
    return true;
  }),
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة'),
  handleValidation
];

// 2. User Administration Validation Rules
const createUserValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('الاسم مطلوب')
    .isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين حرفين و 100 حرف'),
  body('email')
    .trim()
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('صيغة البريد الإلكتروني غير صالحة')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(VALID_ROLES).withMessage('دور المستخدم غير صالح'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 7, max: 20 }).withMessage('رقم الهاتف غير صالح'),
  body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 6 }).withMessage('كلمة المرور يجب أن لا تقل عن 6 أحرف'),
  handleValidation
];

const updateUserValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('معرف المستخدم غير صالح'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين حرفين و 100 حرف'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('صيغة البريد الإلكتروني غير صالحة')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(VALID_ROLES).withMessage('دور المستخدم غير صالح'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 7, max: 20 }).withMessage('رقم الهاتف غير صالح'),
  handleValidation
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين حرفين و 100 حرف'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 7, max: 20 }).withMessage('رقم الهاتف غير صالح'),
  handleValidation
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
  body('newPassword')
    .notEmpty().withMessage('كلمة المرور الجديدة مطلوبة')
    .isLength({ min: 6 }).withMessage('كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف'),
  handleValidation
];

const paramIdValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('المعرف غير صالح'),
  handleValidation
];

// 3. Vehicle Validation Rules
const createVehicleValidation = [
  body('make')
    .trim()
    .notEmpty().withMessage('نوع السيارة (Make) مطلوب')
    .isLength({ min: 1, max: 50 }).withMessage('نوع السيارة غير صالح'),
  body('model')
    .trim()
    .notEmpty().withMessage('موديل السيارة مطلوب')
    .isLength({ min: 1, max: 50 }).withMessage('موديل السيارة غير صالح'),
  body('year')
    .optional({ checkFalsy: true })
    .isInt({ min: 1900, max: 2100 }).withMessage('سنة الصنع غير صالحة'),
  body('license_plate')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 20 }).withMessage('رقم اللوحة غير صالح'),
  body('client_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('معرف العميل غير صالح'),
  handleValidation
];

const updateVehicleValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('معرف المركبة غير صالح'),
  body('make')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('نوع السيارة غير صالح'),
  body('model')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('موديل السيارة غير صالح'),
  body('year')
    .optional({ checkFalsy: true })
    .isInt({ min: 1900, max: 2100 }).withMessage('سنة الصنع غير صالحة'),
  handleValidation
];

// 4. Appointment Validation Rules
const createAppointmentValidation = [
  body('vehicle_id')
    .notEmpty().withMessage('معرف المركبة مطلوب')
    .isInt({ min: 1 }).withMessage('معرف المركبة غير صالح'),
  body('scheduled_date')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('تاريخ الموعد غير صالح'),
  body('problem_description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('وصف المشكلة طويل جداً'),
  handleValidation
];

const updateAppointmentValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('معرف الموعد غير صالح'),
  body('status')
    .optional()
    .isIn(VALID_APPOINTMENT_STATUSES).withMessage('حالة الموعد غير صالحة'),
  body('scheduled_date')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('تاريخ الموعد غير صالح'),
  body('mechanic_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('معرف الميكانيكي غير صالح'),
  handleValidation
];

// 5. Invoice & Payment Validation Rules
const issueInvoiceValidation = [
  body('appointment_id')
    .notEmpty().withMessage('معرف الموعد مطلوب')
    .isInt({ min: 1 }).withMessage('معرف الموعد غير صالح'),
  body('labor_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('تكلفة العمالة يجب أن تكون رقماً موجباً'),
  handleValidation
];

const payInvoiceValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('معرف الفاتورة غير صالح'),
  body('payment_method')
    .optional()
    .isIn(VALID_PAYMENT_METHODS).withMessage('طريقة الدفع غير صالحة'),
  handleValidation
];

// 6. Technical Report Validation Rules
const createTechnicalReportValidation = [
  body('appointment_id')
    .notEmpty().withMessage('معرف الموعد مطلوب')
    .isInt({ min: 1 }).withMessage('معرف الموعد غير صالح'),
  body().custom((value, { req }) => {
    if (!req.body.diagnosis && !req.body.diagnostics) {
      throw new Error('التشخيص الفني مطلوب');
    }
    return true;
  }),
  body('labor_cost')
    .optional()
    .isFloat({ min: 0 }).withMessage('تكلفة العمل اليدوي يجب أن تكون رقماً موجباً'),
  handleValidation
];

// 7. Required Parts Validation Rules
const createRequiredPartValidation = [
  body().custom((value, { req }) => {
    if (!req.body.report_id && !req.body.appointment_id) {
      throw new Error('معرف التقرير أو الموعد مطلوب');
    }
    return true;
  }),
  body('parts')
    .isArray({ min: 1 }).withMessage('قائمة قطع الغيار المطلوبة يجب أن تكون مصفوفة غير فارغة'),
  handleValidation
];

const updateApprovalValidation = [
  body().custom((value, { req }) => {
    if (!req.body.decisions && (!req.body.part_id || !req.body.status)) {
      throw new Error('بيانات الموافقة مطلوبة');
    }
    return true;
  }),
  handleValidation
];

// 8. Review Validation Rules
const createReviewValidation = [
  body('appointment_id')
    .notEmpty().withMessage('معرف الموعد مطلوب')
    .isInt({ min: 1 }).withMessage('معرف الموعد غير صالح'),
  body('rating')
    .notEmpty().withMessage('التقييم مطلوب')
    .isInt({ min: 1, max: 5 }).withMessage('التقييم يجب أن يكون بين 1 و 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('التعليق طويل جداً'),
  handleValidation
];

// 9. Spare Parts (Inventory) Validation Rules
const createSparePartValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('اسم قطعة الغيار مطلوب')
    .isLength({ min: 1, max: 100 }).withMessage('اسم قطعة الغيار غير صالح'),
  body('price')
    .notEmpty().withMessage('السعر مطلوب')
    .isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقماً موجباً'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('الكمية يجب أن تكون رقماً موجباً أو صفراً'),
  handleValidation
];

const updateSparePartValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('معرف قطعة الغيار غير صالح'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('اسم قطعة الغيار غير صالح'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقماً موجباً'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('الكمية يجب أن تكون رقماً موجباً أو صفراً'),
  handleValidation
];

// 10. Email & Password Reset Validation Rules
const resendVerificationValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('صيغة البريد الإلكتروني غير صالحة')
    .normalizeEmail(),
  handleValidation
];

const verifyEmailValidation = [
  query('token')
    .optional()
    .trim()
    .notEmpty().withMessage('رمز التحقق مطلوب'),
  body('token')
    .optional()
    .trim()
    .notEmpty().withMessage('رمز التحقق مطلوب'),
  handleValidation
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('صيغة البريد الإلكتروني غير صالحة')
    .normalizeEmail(),
  handleValidation
];

const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty().withMessage('رمز إعادة التعيين مطلوب')
    .isLength({ min: 10 }).withMessage('رمز إعادة التعيين غير صالح'),
  body('newPassword')
    .notEmpty().withMessage('كلمة المرور الجديدة مطلوبة')
    .isLength({ min: 6 }).withMessage('كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف'),
  handleValidation
];

module.exports = {
  handleValidation,
  registerValidation,
  loginValidation,
  createUserValidation,
  updateUserValidation,
  paramIdValidation,
  createVehicleValidation,
  updateVehicleValidation,
  createAppointmentValidation,
  updateAppointmentValidation,
  issueInvoiceValidation,
  payInvoiceValidation,
  createTechnicalReportValidation,
  createRequiredPartValidation,
  updateApprovalValidation,
  createReviewValidation,
  createSparePartValidation,
  updateSparePartValidation,
  resendVerificationValidation,
  verifyEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  updateProfileValidation,
  changePasswordValidation
};
