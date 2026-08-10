require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
app.use('/api/required-parts', requiredPartRoutes);

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
