const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Appointment, TechnicalReport } = require('../models');
const sendEmail = require('../utils/sendEmail');

module.exports = {
  // POST /api/auth/register
  register: async (req, res) => {
    try {
      const { fullName, phone, email, password } = req.body;
      const { Op } = require('sequelize');

      const existingUser = await User.findOne({ 
        where: { 
          [Op.or]: [{ email }, { phone }] 
        } 
      });

      if (existingUser) {
        return res.status(400).json({ message: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        name: fullName,
        email,
        phone,
        password: hashedPassword,
        role: 'client' // Hardcoded role for security
      });

      const token = jwt.sign(
        { id: newUser.id, role: newUser.role, email: newUser.email },
        process.env.JWT_SECRET || 'safwa_secret_key',
        { expiresIn: '1d' }
      );

      // Send Welcome Email
      const emailHtml = `
        <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #0F766E; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">صفوة لصيانة السيارات</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #0F766E;">مرحباً بك يا ${newUser.name}! 👋</h2>
            <p style="font-size: 16px;">يسعدنا انضمامك إلى نظام <strong>صفوة</strong> لإدارة صيانة السيارات.</p>
            <p style="font-size: 16px;">تم إنشاء حسابك بنجاح. يمكنك الآن إضافة مركباتك، حجز مواعيد الصيانة، ومتابعة التقارير الفنية بكل سهولة وشفافية.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            <p>هذه رسالة تلقائية من نظام صفوة، يرجى عدم الرد عليها.</p>
          </div>
        </div>
      `;

      sendEmail({
        email: newUser.email,
        subject: 'مرحباً بك في نظام صفوة!',
        html: emailHtml
      });

      res.status(201).json({ 
        message: 'تم إنشاء الحساب بنجاح',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/auth/login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Temporary logic: since we don't have seeded users with hashed passwords yet, 
      // we'll bypass real checking if it's the admin for easy development.
      // In production, ALWAYS verify the hashed password.
      let user = await User.findOne({ where: { email } });
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if user is suspended
      if (user.status === 'suspended' || user.status === 'موقوف') {
        return res.status(403).json({ message: 'عذراً، تم إيقاف حسابك. يرجى التواصل مع الإدارة.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET || 'safwa_secret_key',
        { expiresIn: '1d' }
      );

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
      res.status(500).json({ message: 'Server error' });
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
      const { Op } = require('sequelize');
      // Allow filtering by role if query param exists ?role=technician
      const whereClause = {};
      if (req.query.role) {
        whereClause.role = req.query.role;
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
      // Find top technicians
      const staff = await User.findAll({
        where: { role: 'technician' },
        attributes: ['id', 'name', 'role'],
        limit: 3
      });
      
      // Mock stats for now since we don't have enough historical data yet
      const highlights = staff.map(user => ({
        id: user.id,
        name: user.name,
        role: 'فني ميكانيكا',
        roleClass: 'bg-primary-container/10 text-primary',
        avatar: null,
        rating: 4.8,
        activeVehicles: Math.floor(Math.random() * 5) + 1,
        repairsThisMonth: Math.floor(Math.random() * 40) + 10
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
      
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password || 'password123', 10);

      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone
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

      // Check email uniqueness if changing email
      if (email && email !== user.email) {
        const existing = await User.findOne({ where: { email } });
        if (existing) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      await user.update({ name, email, phone, role });
      
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

      // Toggle status between active and suspended
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await user.update({ status: newStatus });

      const userWithoutPassword = user.toJSON();
      delete userWithoutPassword.password;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
