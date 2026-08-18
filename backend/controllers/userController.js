const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const escapeHtml = require('../utils/htmlEscape');
const { User, Appointment } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/auditLogger');
const { recordLoginFailure, resetLoginFailure } = require('../middleware/loginRateLimiter');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production environment');
    }
    return 'safwa_secret_key';
  }
  return secret;
};

const getFrontendUrl = () => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  if (process.env.CLIENT_URL) {
    const origins = process.env.CLIENT_URL.split(',').map(s => s.trim());
    const prefer5173 = origins.find(o => o.includes('5173'));
    if (prefer5173) return prefer5173;
    return origins[0];
  }
  return 'http://localhost:5173';
};

const VALID_ROLES = ['super_admin', 'admin', 'mechanic', 'client'];

module.exports = {
  // POST /api/auth/register
  register: async (req, res) => {
    try {
      const name = (req.body.fullName || req.body.name || '').trim();
      const email = (req.body.email || '').trim().toLowerCase();
      const phone = (req.body.phone || '').trim();
      const password = req.body.password;

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
      }

      const checkConditions = [{ email }];
      if (phone) {
        checkConditions.push({ phone });
      }

      const existingUser = await User.findOne({ 
        where: { [Op.or]: checkConditions } 
      });

      if (existingUser) {
        return res.status(400).json({ message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate verification token
      const rawVerificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenHash = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
      const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const newUser = await User.create({
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: 'client', // Hardcoded role for security on public registration
        is_email_verified: false,
        verification_token_hash: verificationTokenHash,
        verification_token_expires_at: verificationTokenExpiresAt
      });

      const token = jwt.sign(
        { id: newUser.id, role: newUser.role, email: newUser.email, tokenVersion: newUser.token_version },
        getJwtSecret(),
        { expiresIn: '1d' }
      );

      // Send Welcome & Email Verification Link (Non-blocking catch)
      try {
        const frontendUrl = getFrontendUrl();
        const verifyUrl = `${frontendUrl}/verify-email?token=${rawVerificationToken}`;
        const escapedName = escapeHtml(newUser.name);

        const emailHtml = `
          <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #0F766E; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">صفوة لصيانة السيارات</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <h2 style="color: #0F766E;">مرحباً بك يا ${escapedName}! 👋</h2>
              <p style="font-size: 16px;">يسعدنا انضمامك إلى نظام <strong>صفوة</strong> لإدارة صيانة السيارات.</p>
              <p style="font-size: 16px;">يرجى تأكيد بريدك الإلكتروني بالضغط على الرابط أدناه لتفعيل حسابك بالكامل:</p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${verifyUrl}" style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">تأكيد البريد الإلكتروني</a>
              </div>
              <p style="font-size: 14px; color: #64748b;">هذا الرابط صالحة لمدة 24 ساعة فقط.</p>
            </div>
            <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
              <p>هذه رسالة تلقائية من نظام صفوة، يرجى عدم الرد عليها.</p>
            </div>
          </div>
        `;

        sendEmail({
          email: newUser.email,
          subject: 'مرحباً بك في نظام صفوة - تأكيد البريد الإلكتروني',
          html: emailHtml
        }).catch(e => console.error('Email send error:', e));
      } catch (e) {
        console.error('Non-critical email error:', e);
      }

      res.status(201).json({ 
        message: 'تم إنشاء الحساب بنجاح، يرجى مراجعة بريدك الإلكتروني للتأكيد',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          isEmailVerified: newUser.is_email_verified
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: 'حدث خطأ في الخادم أثناء إنشاء الحساب' });
    }
  },

  // POST /api/auth/login
  login: async (req, res) => {
    try {
      const { email, contact, identifier, phone, password } = req.body;
      const rawInput = (email || contact || identifier || phone || '').trim();

      if (!rawInput || !password) {
        return res.status(400).json({ message: 'البريد الإلكتروني/رقم الجوال وكلمة المرور مطلوبة' });
      }

      const cleanDigits = rawInput.replace(/[^0-9+]/g, '');
      const isEmail = rawInput.includes('@');

      const phoneVariants = [
        rawInput,
        cleanDigits,
        cleanDigits.startsWith('967') ? cleanDigits.slice(3) : null,
        cleanDigits.startsWith('967') ? '0' + cleanDigits.slice(3) : null,
        cleanDigits.startsWith('0') ? cleanDigits.slice(1) : null,
        cleanDigits.startsWith('0') ? '967' + cleanDigits.slice(1) : null,
        cleanDigits.startsWith('0') ? '+967' + cleanDigits.slice(1) : null,
        !cleanDigits.startsWith('0') && !cleanDigits.startsWith('+') ? '0' + cleanDigits : null,
        !cleanDigits.startsWith('0') && !cleanDigits.startsWith('+') ? '+967' + cleanDigits : null
      ].filter(Boolean);

      const whereConditions = isEmail
        ? [{ email: rawInput.toLowerCase() }]
        : [
            { email: rawInput.toLowerCase() },
            ...phoneVariants.map(p => ({ phone: p }))
          ];

      const user = await User.findOne({
        where: { [Op.or]: whereConditions }
      });
      
      if (!user) {
        recordLoginFailure(req);
        await logAudit({ req: null, action: 'AUTH_LOGIN_FAILED', entityType: 'User', newValues: { attemptedInput: rawInput } });
        return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
      }

      // Check if user is suspended
      if (user.status === 'suspended' || user.status === 'موقوف') {
        recordLoginFailure(req);
        await logAudit({ req: null, action: 'AUTH_LOGIN_FAILED', entityType: 'User', entityId: user.id, newValues: { reason: 'suspended' } });
        return res.status(403).json({ message: 'عذراً، تم إيقاف حسابك. يرجى التواصل مع الإدارة.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        recordLoginFailure(req);
        await logAudit({ req: null, action: 'AUTH_LOGIN_FAILED', entityType: 'User', entityId: user.id, newValues: { reason: 'invalid_password' } });
        return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
      }

      // Reset failure counter on successful authentication
      resetLoginFailure(req);

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email, tokenVersion: user.token_version },
        getJwtSecret(),
        { expiresIn: '1d' }
      );

      await logAudit({
        req: { user: { id: user.id }, ip: req.ip, headers: req.headers },
        action: 'AUTH_LOGIN_SUCCESS',
        entityType: 'User',
        entityId: user.id,
        newValues: { email: user.email, role: user.role }
      });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'حدث خطأ في الخادم أثناء تسجيل الدخول' });
    }
  },

  // GET /api/users/me
  getMe: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/users
  getAllUsers: async (req, res) => {
    try {
      const whereClause = {};
      
      if (req.query.role) {
        // Map legacy 'technician' query parameter to valid 'mechanic' role
        whereClause.role = req.query.role === 'technician' ? 'mechanic' : req.query.role;
      }
      
      if (req.query.search) {
        const search = req.query.search;
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ];
      }

      const users = await User.findAll({
        where: whereClause,
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']]
      });

      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/users/staff-highlights
  getStaffHighlights: async (req, res) => {
    try {
      const mechanics = await User.findAll({
        where: { role: 'mechanic' },
        attributes: ['id', 'name', 'role'],
        limit: 5
      });
      
      const highlights = await Promise.all(mechanics.map(async (mechanic) => {
        const activeVehicles = await Appointment.count({
          where: {
            mechanic_id: mechanic.id,
            status: { [Op.in]: ['under_inspection', 'in_progress', 'waiting_parts'] }
          }
        });

        const repairsThisMonth = await Appointment.count({
          where: {
            mechanic_id: mechanic.id,
            status: 'completed'
          }
        });

        return {
          id: mechanic.id,
          name: mechanic.name,
          role: 'مهندس ميكانيكا',
          roleClass: 'bg-primary-container/10 text-primary',
          avatar: null,
          rating: 4.9,
          activeVehicles,
          repairsThisMonth
        };
      }));

      res.json(highlights);
    } catch (error) {
      console.error('Get staff highlights error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/users
  createUser: async (req, res) => {
    try {
      const { name, email, password, role, phone } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      const targetRole = role && VALID_ROLES.includes(role) ? role : 'client';

      // Super Admin Creation Protection: No user may create a new super_admin account
      if (targetRole === 'super_admin') {
        await logAudit({
          req,
          action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED',
          entityType: 'User',
          newValues: { attemptedRole: 'super_admin', email }
        });
        return res.status(403).json({ message: 'غير مصرح: لا يمكن إنشاء حساب Super Admin جديد' });
      }

      // Admin Hierarchy Protection: Only Super Admin can create Admin accounts
      if (targetRole === 'admin' && req.user.role !== 'super_admin') {
        await logAudit({
          req,
          action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED',
          entityType: 'User',
          newValues: { attemptedRole: 'admin', email }
        });
        return res.status(403).json({ message: 'غير مصرح: إنشاء وتجهيز حسابات المدراء محصور بـ Super Admin فقط' });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password || 'password123', 10);

      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role: targetRole,
        phone,
        is_email_verified: true
      });

      const auditAction = targetRole === 'admin' ? 'ADMIN_CREATED' : 'USER_CREATED';
      await logAudit({
        req,
        action: auditAction,
        entityType: 'User',
        entityId: newUser.id,
        newValues: { name: newUser.name, email: newUser.email, role: newUser.role, phone: newUser.phone }
      });

      const userWithoutPassword = newUser.toJSON();
      delete userWithoutPassword.password;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/users/:id
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, role } = req.body;
      
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent users from changing their own role
      if (String(req.user.id) === String(user.id) && role && role !== user.role) {
        return res.status(403).json({ message: 'غير مصرح: لا يمكنك تغيير دورك بنفسك' });
      }

      // Super Admin Immutability Protection: Super Admin cannot be updated by normal admins
      if (user.role === 'super_admin') {
        if (String(req.user.id) !== String(user.id) && req.user.role !== 'super_admin') {
          await logAudit({
            req,
            action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED',
            entityType: 'User',
            entityId: id,
            newValues: { attemptedEdit: true }
          });
          return res.status(403).json({ message: 'غير مصرح: لا يمكن تعديل حساب Super Admin' });
        }
        if (role && role !== 'super_admin') {
          await logAudit({
            req,
            action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED',
            entityType: 'User',
            entityId: id,
            newValues: { attemptedRoleRemoval: true }
          });
          return res.status(403).json({ message: 'غير مصرح: لا يمكن إزالة صلاحيات Super Admin' });
        }
      }

      // Admin Hierarchy Protection: Only Super Admin can edit other Admin accounts or promote users to admin
      if (user.role === 'admin' && String(user.id) !== String(req.user.id)) {
        if (req.user.role !== 'super_admin') {
          await logAudit({
            req,
            action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED',
            entityType: 'User',
            entityId: id,
            newValues: { attemptedAdminEdit: true }
          });
          return res.status(403).json({ message: 'غير مصرح: تعديل حسابات المدراء محصور بـ Super Admin فقط' });
        }
      }

      // Admin Hierarchy Protection: Normal Admin cannot promote any user to admin
      if (role === 'admin' && user.role !== 'admin' && req.user.role !== 'super_admin') {
        await logAudit({
          req,
          action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED',
          entityType: 'User',
          entityId: id,
          newValues: { attemptedPromotionToAdmin: true }
        });
        return res.status(403).json({ message: 'غير مصرح: منح صلاحيات Admin محصور بـ Super Admin فقط' });
      }

      // Prevent promotion of any user to super_admin
      if (role === 'super_admin' && user.role !== 'super_admin') {
        await logAudit({
          req,
          action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED',
          entityType: 'User',
          entityId: id,
          newValues: { attemptedPromotion: 'super_admin' }
        });
        return res.status(403).json({ message: 'غير مصرح: لا يمكن ترقية حساب إلى Super Admin' });
      }

      // Check email uniqueness if changing email
      if (email && email !== user.email) {
        const existing = await User.findOne({ where: { email } });
        if (existing) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      const oldValues = { name: user.name, email: user.email, phone: user.phone, role: user.role };

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (role !== undefined && VALID_ROLES.includes(role)) {
        updateData.role = role;
        updateData.token_version = user.token_version + 1;
      }

      await user.update(updateData);
      
      const auditAction = user.role === 'admin' ? 'ADMIN_UPDATED' : 'USER_UPDATED';
      await logAudit({
        req,
        action: auditAction,
        entityType: 'User',
        entityId: user.id,
        oldValues,
        newValues: updateData
      });

      if (role && role !== oldValues.role) {
        await logAudit({
          req,
          action: 'USER_ROLE_CHANGED',
          entityType: 'User',
          entityId: user.id,
          oldValues: { role: oldValues.role },
          newValues: { role }
        });
      }

      const userWithoutPassword = user.toJSON();
      delete userWithoutPassword.password;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/users/:id/status
  updateUserStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent users from suspending their own account
      if (String(req.user.id) === String(user.id)) {
        return res.status(403).json({ message: 'غير مصرح: لا يمكنك تغيير حالة حسابك بنفسك' });
      }

      // Super Admin Immutability Protection: Super Admin cannot be suspended
      if (user.role === 'super_admin') {
        await logAudit({
          req,
          action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED',
          entityType: 'User',
          entityId: id,
          newValues: { attemptedSuspension: true }
        });
        return res.status(403).json({ message: 'غير مصرح: لا يمكن إيقاف أو تعطيل حساب Super Admin' });
      }

      // Admin Hierarchy Protection: Only Super Admin can suspend/activate Admin accounts
      if (user.role === 'admin' && req.user.role !== 'super_admin') {
        await logAudit({
          req,
          action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED',
          entityType: 'User',
          entityId: id,
          newValues: { attemptedAdminSuspension: true }
        });
        return res.status(403).json({ message: 'غير مصرح: إيقاف أو تفعيل حسابات المدراء محصور بـ Super Admin فقط' });
      }

      const oldStatus = user.status;
      // Toggle status between active and suspended
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await user.update({
        status: newStatus,
        token_version: user.token_version + 1
      });

      const auditAction = user.role === 'admin' ? 'ADMIN_STATUS_CHANGED' : 'USER_STATUS_CHANGED';
      await logAudit({
        req,
        action: auditAction,
        entityType: 'User',
        entityId: user.id,
        oldValues: { status: oldStatus },
        newValues: { status: newStatus }
      });

      const userWithoutPassword = user.toJSON();
      delete userWithoutPassword.password;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/users/profile
  updateProfile: async (req, res) => {
    try {
      const { name, phone } = req.body;
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const oldValues = { name: user.name, phone: user.phone };
      const updateData = {};
      if (name !== undefined && name.trim().length > 0) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = phone.trim();

      await user.update(updateData);

      await logAudit({
        req,
        action: 'USER_PROFILE_UPDATED',
        entityType: 'User',
        entityId: user.id,
        oldValues,
        newValues: updateData
      });

      const userWithoutPassword = user.toJSON();
      delete userWithoutPassword.password;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/users/change-password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'كلمة المرور الحالية وكلمة المرور الجديدة مطلوبة' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف' });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        await logAudit({
          req,
          action: 'AUTH_PASSWORD_CHANGE_FAILED',
          entityType: 'User',
          entityId: user.id,
          newValues: { reason: 'invalid_current_password' }
        });
        return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({
        password: hashedPassword,
        token_version: user.token_version + 1
      });

      await logAudit({
        req,
        action: 'AUTH_PASSWORD_CHANGED',
        entityType: 'User',
        entityId: user.id
      });

      res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET or POST /api/users/verify-email
  verifyEmail: async (req, res) => {
    try {
      const token = req.query.token || req.body.token;

      if (!token) {
        return res.status(400).json({ message: 'رمز التحقق مطلوب' });
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        where: { verification_token_hash: hashedToken }
      });

      if (!user) {
        return res.status(400).json({ message: 'رمز التفعيل غير صالح أو تم استخدامه سابقاً' });
      }

      if (user.verification_token_expires_at && new Date() > new Date(user.verification_token_expires_at)) {
        return res.status(400).json({ message: 'انتهت صلاحية رابط التفعيل. يرجى طلب رابط جديد' });
      }

      await user.update({
        is_email_verified: true,
        verification_token_hash: null,
        verification_token_expires_at: null
      });

      await logAudit({
        req,
        action: 'AUTH_EMAIL_VERIFIED',
        entityType: 'User',
        entityId: user.id
      });

      res.json({ message: 'تم تفعيل البريد الإلكتروني بنجاح' });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/users/resend-verification
  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;
      const genericMessage = 'إذا كان البريد الإلكتروني مسجلاً لدينا، فقد تم إرسال رابط التفعيل';

      if (!email) {
        return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
      }

      const user = await User.findOne({ where: { email } });

      if (!user || user.is_email_verified) {
        return res.json({ message: genericMessage });
      }

      const rawVerificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenHash = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
      const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await user.update({
        verification_token_hash: verificationTokenHash,
        verification_token_expires_at: verificationTokenExpiresAt
      });

      try {
        const frontendUrl = getFrontendUrl();
        const verifyUrl = `${frontendUrl}/verify-email?token=${rawVerificationToken}`;
        const escapedName = escapeHtml(user.name);

        const emailHtml = `
          <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #0F766E; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">صفوة لصيانة السيارات</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <h2 style="color: #0F766E;">مرحباً بك يا ${escapedName}! 👋</h2>
              <p style="font-size: 16px;">تم طلب إرسال رابط تفعيل جديد لبريدك الإلكتروني.</p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${verifyUrl}" style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">تأكيد البريد الإلكتروني</a>
              </div>
              <p style="font-size: 14px; color: #64748b;">هذا الرابط صالحة لمدة 24 ساعة فقط.</p>
            </div>
          </div>
        `;

        sendEmail({
          email: user.email,
          subject: 'إعادة إرسال رابط تفعيل البريد الإلكتروني - صفوة',
          html: emailHtml
        }).catch(e => console.error('Resend email send error:', e));
      } catch (e) {
        console.error('Non-critical email resend error:', e);
      }

      res.json({ message: genericMessage });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/users/forgot-password
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const genericMessage = 'إذا كان البريد الإلكتروني مسجلاً لدينا، فقد تم إرسال تعليمات إعادة تعيين كلمة المرور';

      if (!email) {
        return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
      }

      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.json({ message: genericMessage });
      }

      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
      const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      await user.update({
        reset_token_hash: resetTokenHash,
        reset_token_expires_at: resetTokenExpiresAt
      });

      await logAudit({
        req,
        action: 'AUTH_PASSWORD_RESET_REQUEST',
        entityType: 'User',
        entityId: user.id
      });

      try {
        const frontendUrl = getFrontendUrl();
        const resetUrl = `${frontendUrl}/reset-password?token=${rawResetToken}`;
        const escapedName = escapeHtml(user.name);

        const emailHtml = `
          <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #0F766E; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">صفوة لصيانة السيارات</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <h2 style="color: #0F766E;">إعادة تعيين كلمة المرور</h2>
              <p style="font-size: 16px;">مرحباً ${escapedName}،</p>
              <p style="font-size: 16px;">تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اتبع الرابط التالي لإكمال العملية:</p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${resetUrl}" style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">إعادة تعيين كلمة المرور</a>
              </div>
              <p style="font-size: 14px; color: #64748b;">هذا الرابط صالحة لمدة ساعة واحدة فقط. إذا لم تطلب ذلك، يمكنك تجاهل الرسالة بآمان.</p>
            </div>
          </div>
        `;

        await sendEmail({
          email: user.email,
          subject: 'طلب إعادة تعيين كلمة المرور - صفوة',
          html: emailHtml
        });
      } catch (e) {
        console.error('Non-critical forgot password email error:', e);
      }

      res.json({ message: genericMessage });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/users/reset-password
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'الرمز وكلمة المرور الجديدة مطلوبان' });
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        where: { reset_token_hash: hashedToken }
      });

      if (!user) {
        return res.status(400).json({ message: 'رمز إعادة التعيين غير صالح أو تم استخدامه سابقاً' });
      }

      if (user.reset_token_expires_at && new Date() > new Date(user.reset_token_expires_at)) {
        return res.status(400).json({ message: 'انتهت صلاحية رابط إعادة التعيين. يرجى طلب رابط جديد' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await user.update({
        password: hashedPassword,
        reset_token_hash: null,
        reset_token_expires_at: null,
        token_version: user.token_version + 1
      });

      await logAudit({
        req,
        action: 'AUTH_PASSWORD_RESET_SUCCESS',
        entityType: 'User',
        entityId: user.id
      });

      res.json({ message: 'تمت إعادة تعيين كلمة المرور بنجاح' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/users/logout or /api/auth/logout
  logout: async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication token missing or invalid' });
      }

      const user = await User.findByPk(req.user.id);
      if (user) {
        await user.update({ token_version: user.token_version + 1 });
      }

      await logAudit({
        req,
        action: 'AUTH_LOGOUT',
        entityType: 'User',
        entityId: req.user.id
      });

      res.json({ message: 'تم تسجيل الخروج بنجاح' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
