# STEP 6 — AUDIT REPORT: SERVER STARTUP & ENVIRONMENT REFACTORING

**Date**: 2026-08-10  
**Project**: SAFWA Automobile Maintenance Backend  
**Audit Scope**: `backend/server.js`, Server Initialization, Express App Export, Database Sync Lifecycle, Global Error Middleware, 404 Route Fallback, and Environment Variable Management.  
**Execution Status**: **AUDIT ONLY COMPLETED (AWAITING USER APPROVAL)**

---

## 1. STEP 6 Objective
The objective of Step 6 is to refactor server initialization in `backend/server.js` so that the Express application is properly modularized, robust, and clean:
1. **App & Server Decoupling**: Export the configured Express `app` instance from `server.js` (or separate entry points) so integration tests and external runners can import `app` without involuntarily binding to TCP port 5000 or triggering automatic DB syncs.
2. **Database Lifecycle Control**: Isolate `sequelize.authenticate()` and `sequelize.sync()` startup calls with graceful connection error logging.
3. **Global Error Handling Middleware**: Implement a centralized Express error handler (`(err, req, res, next)`) to capture unhandled errors gracefully instead of crashing or leaking stack traces.
4. **Fallback 404 Handler**: Catch all unmatched API routes with a clean JSON 404 response.
5. **CORS & Environment Handling**: Ensure CORS options and environment variables (`PORT`, `NODE_ENV`) are cleanly managed.

---

## 2. Current State Findings (`backend/server.js`)

| Finding ID | Component | Current Implementation | Risk / Impact | Proposed Fix |
|---|---|---|---|---|
| **F-6.1** | App Export | `server.js` does NOT export `module.exports = app`. | Supertest / Integration scripts cannot import `app` directly from `server.js`. | Export `app` at the end of `server.js` (or export both `app` and `server`). |
| **F-6.2** | Auto Startup | `sequelize.sync().then(() => app.listen(...))` runs automatically on module `require('./server')`. | Importing `server.js` in tests triggers port binding and DB sync side effects. | Wrap `app.listen()` inside `if (require.main === module)` block. |
| **F-6.3** | DB Connection | `sequelize.sync()` used directly without `sequelize.authenticate()`. | Database connection failures produce unhandled promise rejections. | Test connection with `sequelize.authenticate()` before syncing. |
| **F-6.4** | Global Error Handler | Missing Express 4-parameter error middleware (`(err, req, res, next)`). | Unhandled controller/middleware exceptions return default HTML error pages or unhandled rejections. | Add standard JSON error handler middleware at the bottom of route definitions. |
| **F-6.5** | Unmatched 404 Handler | Missing explicit `app.use('*', ...)` for undefined API endpoints. | Undefined endpoints return default Express HTML 404 responses instead of standardized JSON. | Add JSON fallback 404 handler for unmatched routes. |

---

## 3. Allowed Files for Step 6
- `backend/server.js`
- `backend/docs/STEP6_AUDIT.md`
- `implementation_plan.md`
- `scratch/test_batch6_1.js` (Temporary test script)

## 4. Forbidden Files for Step 6
- `backend/controllers/*`
- `backend/routes/*`
- `backend/models/*`
- `backend/middleware/*`
- `backend/migrations/*`
- `backend/seeders/*`
- `backend/factories/*`

---

## 5. Proposed Step 6 Architecture (`server.js`)

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middleware
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

app.use('/api/auth', userRoutes);
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

// Unmatched Route 404 Fallback
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Centralized Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server only when executed directly (not when required as a module in tests)
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
```

---

## 6. Verification Plan for Step 6
1. **Module Export Verification**: Require `./server` in `scratch/test_batch6_1.js` without starting HTTP listener or triggering DB sync.
2. **404 Route Verification**: Send request to `/api/nonexistent-route` and verify JSON `{ message: "Route /api/nonexistent-route not found" }` with status 404.
3. **Global Error Handler Verification**: Trigger an unhandled route error and verify clean JSON error response without process crash.
4. **Full System Regression Verification**: Re-run all 10 previous test suites to ensure 100% compatibility across all prior steps.
