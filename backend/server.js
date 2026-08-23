require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Serve static upload directory safely
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS Configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser agents (mobile apps/curl) or allowed origins or non-production mode
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body Parser with Payload Size Protection
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const { loginRateLimiter } = require('./middleware/loginRateLimiter');

// Rate Limiter for Account Recovery Endpoints
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { message: 'تم تجاوز عدد المحاولات المسموح بها، يرجى الانتظار 15 دقيقة' }
});

// Apply rate limiting to authentication login (progressive) & recovery routes
app.use('/api/auth/login', loginRateLimiter);
app.use('/api/users/login', loginRateLimiter);

app.use('/api/auth/resend-verification', recoveryLimiter);
app.use('/api/auth/forgot-password', recoveryLimiter);
app.use('/api/auth/reset-password', recoveryLimiter);
app.use('/api/users/resend-verification', recoveryLimiter);
app.use('/api/users/forgot-password', recoveryLimiter);
app.use('/api/users/reset-password', recoveryLimiter);

// Routes
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const customerRoutes = require('./routes/customerRoutes');
const sparePartRoutes = require('./routes/sparePartRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const technicalReportRoutes = require('./routes/technicalReportRoutes');
const requiredPartRoutes = require('./routes/requiredPartRoutes');
const newPartRequestRoutes = require('./routes/newPartRequestRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const walkInCustomerRoutes = require('./routes/walkInCustomerRoutes');
const walkInVisitRoutes = require('./routes/walkInVisitRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

app.use('/api/auth', userRoutes); // POST /api/auth/login
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/inventory', sparePartRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', technicalReportRoutes);
app.use('/api/technical-reports', technicalReportRoutes);
app.use('/api/required-parts', requiredPartRoutes);
app.use('/api/new-part-requests', newPartRequestRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/walk-in-customers', walkInCustomerRoutes);
app.use('/api/walk-in-visits', walkInVisitRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('/', (req, res) => {
  res.send('SAFWA Backend API is running...');
});

// Route for testing global error handler in test environment
if (process.env.NODE_ENV === 'test') {
  app.get('/api/test-error', (req, res, next) => {
    next(new Error('Simulated internal server failure'));
  });
}

// Unmatched Route 404 Fallback (JSON response)
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Centralized Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Express Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Only start DB connection sync and listen when executed directly via 'node server.js'
if (require.main === module) {
  sequelize.authenticate()
    .then(() => {
      console.log('Database connection authenticated successfully');
      return sequelize.sync();
    })
    .then(() => {
      console.log('Database synced successfully');
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Error starting server or connecting to database:', error);
      process.exit(1);
    });
}

module.exports = app;
