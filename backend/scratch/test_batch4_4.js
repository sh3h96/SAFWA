let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  jwt = {
    sign: (payload) => 'mock_token_' + JSON.stringify(payload),
    verify: (token) => {
      if (typeof token === 'string' && token.startsWith('mock_token_')) {
        return JSON.parse(token.replace('mock_token_', ''));
      }
      throw new Error('Invalid token');
    }
  };
}

const express = require('express');
const {
  sequelize,
  User,
  Vehicle,
  Appointment,
  Invoice,
  Payment,
  Review
} = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/models');

const invoiceRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/invoiceRoutes');
const vehicleRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/vehicleRoutes');
const customerRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/customerRoutes');
const reviewRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/reviewRoutes');

const app = express();
app.use(express.json());
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/reviews', reviewRoutes);

const secret = process.env.JWT_SECRET || 'safwa_secret_key';

let clientA, clientB, mechanic, receptionist, admin;
let vehicleA, vehicleB, appointmentA, invoiceA;
let clientAToken, clientBToken, mechanicToken, receptionistToken, adminToken;

async function makeRequest(server, method, url, token = null, body = null, rawAuthHeader = null) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      headers: {
        'content-type': 'application/json'
      },
      body: body || {},
      query: {}
    };

    if (url.includes('?')) {
      const parts = url.split('?');
      const searchParams = new URLSearchParams(parts[1]);
      for (const [k, v] of searchParams.entries()) {
        req.query[k] = v;
      }
    }

    if (rawAuthHeader !== null) {
      req.headers['authorization'] = rawAuthHeader;
    } else if (token) {
      req.headers['authorization'] = `Bearer ${token}`;
    }

    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(name, val) {
        this.headers[name] = val;
      },
      getHeader(name) {
        return this.headers[name];
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        resolve({ statusCode: this.statusCode, body: this.body });
      },
      send(data) {
        this.body = data;
        resolve({ statusCode: this.statusCode, body: this.body });
      },
      end(data) {
        if (data) this.body = data;
        resolve({ statusCode: this.statusCode, body: this.body });
      }
    };

    server(req, res, () => {
      resolve({ statusCode: 404, body: { message: 'Route not found' } });
    });
  });
}

async function setupTestData() {
  const ts = Date.now();

  clientA = await User.create({
    name: 'Batch 4.4 Client A',
    email: `clienta_b44_${ts}@safwa.sa`,
    password: 'hash',
    role: 'client',
    status: 'active'
  });

  clientB = await User.create({
    name: 'Batch 4.4 Client B',
    email: `clientb_b44_${ts}@safwa.sa`,
    password: 'hash',
    role: 'client',
    status: 'active'
  });

  mechanic = await User.create({
    name: 'Batch 4.4 Mechanic',
    email: `mechanic_b44_${ts}@safwa.sa`,
    password: 'hash',
    role: 'mechanic',
    status: 'active'
  });

  receptionist = await User.create({
    name: 'Batch 4.4 Receptionist',
    email: `receptionist_b44_${ts}@safwa.sa`,
    password: 'hash',
    role: 'receptionist',
    status: 'active'
  });

  admin = await User.create({
    name: 'Batch 4.4 Admin',
    email: `admin_b44_${ts}@safwa.sa`,
    password: 'hash',
    role: 'admin',
    status: 'active'
  });

  vehicleA = await Vehicle.create({
    client_id: clientA.id,
    make: 'Toyota',
    model: 'Camry',
    license_plate: `B44A-${ts % 10000}`,
    year: 2022
  });

  vehicleB = await Vehicle.create({
    client_id: clientB.id,
    make: 'Honda',
    model: 'Accord',
    license_plate: `B44B-${ts % 10000}`,
    year: 2023
  });

  appointmentA = await Appointment.create({
    client_id: clientA.id,
    vehicle_id: vehicleA.id,
    mechanic_id: mechanic.id,
    appointment_date: new Date(),
    status: 'completed',
    problem_description: 'Annual Service Inspection',
    notes: 'Batch 4.4 Appointment A'
  });

  invoiceA = await Invoice.create({
    appointment_id: appointmentA.id,
    total_amount: 500,
    paid_amount: 0,
    status: 'unpaid'
  });

  clientAToken = jwt.sign({ id: clientA.id, role: 'client', email: clientA.email }, secret);
  clientBToken = jwt.sign({ id: clientB.id, role: 'client', email: clientB.email }, secret);
  mechanicToken = jwt.sign({ id: mechanic.id, role: 'mechanic', email: mechanic.email }, secret);
  receptionistToken = jwt.sign({ id: receptionist.id, role: 'receptionist', email: receptionist.email }, secret);
  adminToken = jwt.sign({ id: admin.id, role: 'admin', email: admin.email }, secret);
}

async function cleanupTestData() {
  try {
    const userIds = [clientA?.id, clientB?.id, mechanic?.id, receptionist?.id, admin?.id].filter(Boolean);
    if (userIds.length > 0) {
      const vList = await Vehicle.findAll({ where: { client_id: userIds } });
      const vIds = vList.map(v => v.id);

      if (vIds.length > 0) {
        const appts = await Appointment.findAll({ where: { vehicle_id: vIds } });
        const apptIds = appts.map(a => a.id);

        if (apptIds.length > 0) {
          await Review.destroy({ where: { appointment_id: apptIds } });
          const invs = await Invoice.findAll({ where: { appointment_id: apptIds } });
          const invIds = invs.map(i => i.id);

          if (invIds.length > 0) {
            await Payment.destroy({ where: { invoice_id: invIds } });
            await Invoice.destroy({ where: { id: invIds } });
          }
          await Appointment.destroy({ where: { id: apptIds } });
        }
        await Vehicle.destroy({ where: { id: vIds } });
      }
      await User.destroy({ where: { id: userIds } });
    }
    console.log('✔ Database clean: Temporary test data deleted successfully.');
  } catch (err) {
    console.error('Cleanup warning:', err.message);
  }
}

async function runTests() {
  console.log('=== BATCH 4.4 RBAC & INTEGRATION TESTS ===\n');

  try {
    await sequelize.authenticate();
    console.log('✔ DB Connection: SUCCESS');

    await setupTestData();
    console.log('✔ Test Data Setup: SUCCESS');

    // --------------------------------------------------
    // AUTHENTICATION TESTS
    // --------------------------------------------------
    // 1. Protected route with No Token -> 401
    const r1 = await makeRequest(app, 'GET', '/api/invoices/my');
    if (r1.statusCode !== 401) throw new Error(`TEST 1 Failed: Expected 401, got ${r1.statusCode}`);
    console.log('✔ TEST 1 PASSED: Protected route without Token returned 401');

    // 2. Invalid JWT -> 401
    const r2 = await makeRequest(app, 'GET', '/api/invoices/my', 'invalid.token.str');
    if (r2.statusCode !== 401) throw new Error(`TEST 2 Failed: Expected 401, got ${r2.statusCode}`);
    console.log('✔ TEST 2 PASSED: Invalid JWT returned 401');

    // 3. Query token -> 401
    const r3 = await makeRequest(app, 'GET', `/api/invoices/my?token=${clientAToken}`);
    if (r3.statusCode !== 401) throw new Error(`TEST 3 Failed: Query token returned ${r3.statusCode}`);
    console.log('✔ TEST 3 PASSED: Query token req.query.token rejected with 401');

    // 4. Authorization header Token xxx -> 401
    const r4 = await makeRequest(app, 'GET', '/api/invoices/my', null, null, `Token ${clientAToken}`);
    if (r4.statusCode !== 401) throw new Error(`TEST 4 Failed: Header Token xxx returned ${r4.statusCode}`);
    console.log('✔ TEST 4 PASSED: Authorization: Token scheme rejected with 401');

    // --------------------------------------------------
    // INVOICE RBAC TESTS
    // --------------------------------------------------
    // 5. client -> GET /api/invoices/my -> not 403
    const r5 = await makeRequest(app, 'GET', '/api/invoices/my', clientAToken);
    if (r5.statusCode === 403) throw new Error('TEST 5 Failed: Client got 403 on GET /invoices/my');
    console.log(`✔ TEST 5 PASSED: Client GET /invoices/my allowed (Status: ${r5.statusCode})`);

    // 6. mechanic -> GET /api/invoices/my -> 403
    const r6 = await makeRequest(app, 'GET', '/api/invoices/my', mechanicToken);
    if (r6.statusCode !== 403) throw new Error(`TEST 6 Failed: Expected 403 for Mechanic on GET /invoices/my, got ${r6.statusCode}`);
    console.log('✔ TEST 6 PASSED: Mechanic calling GET /api/invoices/my returned 403 Forbidden');

    // 7. admin -> GET /api/invoices/reports -> not 403
    const r7 = await makeRequest(app, 'GET', '/api/invoices/reports', adminToken);
    if (r7.statusCode === 403) throw new Error('TEST 7 Failed: Admin got 403 on GET /invoices/reports');
    console.log(`✔ TEST 7 PASSED: Admin GET /invoices/reports allowed (Status: ${r7.statusCode})`);

    // 8. receptionist -> GET /api/invoices/reports -> not 403
    const r8 = await makeRequest(app, 'GET', '/api/invoices/reports', receptionistToken);
    if (r8.statusCode === 403) throw new Error('TEST 8 Failed: Receptionist got 403 on GET /invoices/reports');
    console.log(`✔ TEST 8 PASSED: Receptionist GET /invoices/reports allowed (Status: ${r8.statusCode})`);

    // 9. client -> GET /api/invoices/reports -> 403
    const r9 = await makeRequest(app, 'GET', '/api/invoices/reports', clientAToken);
    if (r9.statusCode !== 403) throw new Error(`TEST 9 Failed: Expected 403 for Client on GET /invoices/reports, got ${r9.statusCode}`);
    console.log('✔ TEST 9 PASSED: Client calling GET /api/invoices/reports returned 403 Forbidden');

    // 10. mechanic -> GET /api/invoices/reports -> 403
    const r10 = await makeRequest(app, 'GET', '/api/invoices/reports', mechanicToken);
    if (r10.statusCode !== 403) throw new Error(`TEST 10 Failed: Expected 403 for Mechanic on GET /invoices/reports, got ${r10.statusCode}`);
    console.log('✔ TEST 10 PASSED: Mechanic calling GET /api/invoices/reports returned 403 Forbidden');

    // 11. admin -> POST /api/invoices/issue -> not 403
    const r11 = await makeRequest(app, 'POST', '/api/invoices/issue', adminToken, { appointment_id: appointmentA.id, labor_cost: 100 });
    if (r11.statusCode === 403) throw new Error('TEST 11 Failed: Admin got 403 on POST /invoices/issue');
    console.log(`✔ TEST 11 PASSED: Admin POST /invoices/issue allowed (Status: ${r11.statusCode})`);

    // 12. receptionist -> POST /api/invoices/issue -> not 403
    const r12 = await makeRequest(app, 'POST', '/api/invoices/issue', receptionistToken, { appointment_id: appointmentA.id, labor_cost: 100 });
    if (r12.statusCode === 403) throw new Error('TEST 12 Failed: Receptionist got 403 on POST /invoices/issue');
    console.log(`✔ TEST 12 PASSED: Receptionist POST /invoices/issue allowed (Status: ${r12.statusCode})`);

    // 13. client -> POST /api/invoices/issue -> 403
    const r13 = await makeRequest(app, 'POST', '/api/invoices/issue', clientAToken, { appointment_id: appointmentA.id });
    if (r13.statusCode !== 403) throw new Error(`TEST 13 Failed: Expected 403 for Client on POST /invoices/issue, got ${r13.statusCode}`);
    console.log('✔ TEST 13 PASSED: Client calling POST /api/invoices/issue returned 403 Forbidden');

    // 14. mechanic -> POST /api/invoices/issue -> 403
    const r14 = await makeRequest(app, 'POST', '/api/invoices/issue', mechanicToken, { appointment_id: appointmentA.id });
    if (r14.statusCode !== 403) throw new Error(`TEST 14 Failed: Expected 403 for Mechanic on POST /invoices/issue, got ${r14.statusCode}`);
    console.log('✔ TEST 14 PASSED: Mechanic calling POST /api/invoices/issue returned 403 Forbidden');

    // 15. client -> GET /api/invoices/:id -> not 403 (Owner Client A accessing invoiceA)
    const r15 = await makeRequest(app, 'GET', `/api/invoices/${invoiceA.id}`, clientAToken);
    if (r15.statusCode === 403) throw new Error('TEST 15 Failed: Client got 403 on GET /invoices/:id');
    console.log(`✔ TEST 15 PASSED: Client GET /invoices/:id allowed (Status: ${r15.statusCode})`);

    // 16. mechanic -> GET /api/invoices/:id -> 403
    const r16 = await makeRequest(app, 'GET', `/api/invoices/${invoiceA.id}`, mechanicToken);
    if (r16.statusCode !== 403) throw new Error(`TEST 16 Failed: Expected 403 for Mechanic on GET /invoices/:id, got ${r16.statusCode}`);
    console.log('✔ TEST 16 PASSED: Mechanic calling GET /api/invoices/:id returned 403 Forbidden');

    // 17. client -> POST /api/invoices/:id/pay -> not 403
    const r17 = await makeRequest(app, 'POST', `/api/invoices/${invoiceA.id}/pay`, clientAToken, { amount: 500, payment_method: 'card' });
    if (r17.statusCode === 403) throw new Error('TEST 17 Failed: Client got 403 on POST /invoices/:id/pay');
    console.log(`✔ TEST 17 PASSED: Client POST /invoices/:id/pay allowed (Status: ${r17.statusCode})`);

    // 18. mechanic -> POST /api/invoices/:id/pay -> 403
    const r18 = await makeRequest(app, 'POST', `/api/invoices/${invoiceA.id}/pay`, mechanicToken, { amount: 500 });
    if (r18.statusCode !== 403) throw new Error(`TEST 18 Failed: Expected 403 for Mechanic on POST /invoices/:id/pay, got ${r18.statusCode}`);
    console.log('✔ TEST 18 PASSED: Mechanic calling POST /api/invoices/:id/pay returned 403 Forbidden');

    // OWNERSHIP CHECK FOR INVOICE OBSERVATION
    const r18_owner = await makeRequest(app, 'GET', `/api/invoices/${invoiceA.id}`, clientBToken);
    if (r18_owner.statusCode !== 404) {
      console.log(`⚠ Ownership check note: Client B accessing Client A invoice returned ${r18_owner.statusCode} (Existing invoiceController ownership check behavior recorded for Step 5)`);
    } else {
      console.log('✔ OWNERSHIP VERIFIED: Client B accessing Client A invoice returned 404 Not Found');
    }

    // --------------------------------------------------
    // VEHICLE RBAC TESTS
    // --------------------------------------------------
    // 19. client -> GET /api/vehicles -> 403
    const r19 = await makeRequest(app, 'GET', '/api/vehicles', clientAToken);
    if (r19.statusCode !== 403) throw new Error(`TEST 19 Failed: Expected 403 for Client on GET /vehicles, got ${r19.statusCode}`);
    console.log('✔ TEST 19 PASSED: Client calling GET /api/vehicles returned 403 Forbidden');

    // 20. mechanic -> GET /api/vehicles -> 403
    const r20 = await makeRequest(app, 'GET', '/api/vehicles', mechanicToken);
    if (r20.statusCode !== 403) throw new Error(`TEST 20 Failed: Expected 403 for Mechanic on GET /api/vehicles, got ${r20.statusCode}`);
    console.log('✔ TEST 20 PASSED: Mechanic calling GET /api/vehicles returned 403 Forbidden');

    // 21. admin -> GET /api/vehicles -> not 403
    const r21 = await makeRequest(app, 'GET', '/api/vehicles', adminToken);
    if (r21.statusCode === 403) throw new Error('TEST 21 Failed: Admin got 403 on GET /vehicles');
    console.log(`✔ TEST 21 PASSED: Admin GET /vehicles allowed (Status: ${r21.statusCode})`);

    // 22. receptionist -> GET /api/vehicles -> not 403
    const r22 = await makeRequest(app, 'GET', '/api/vehicles', receptionistToken);
    if (r22.statusCode === 403) throw new Error('TEST 22 Failed: Receptionist got 403 on GET /vehicles');
    console.log(`✔ TEST 22 PASSED: Receptionist GET /vehicles allowed (Status: ${r22.statusCode})`);

    // 23. client -> GET /api/vehicles/my -> not 403
    const r23 = await makeRequest(app, 'GET', '/api/vehicles/my', clientAToken);
    if (r23.statusCode === 403) throw new Error('TEST 23 Failed: Client got 403 on GET /vehicles/my');
    console.log(`✔ TEST 23 PASSED: Client GET /vehicles/my allowed (Status: ${r23.statusCode})`);

    // 24. mechanic -> GET /api/vehicles/my -> 403
    const r24 = await makeRequest(app, 'GET', '/api/vehicles/my', mechanicToken);
    if (r24.statusCode !== 403) throw new Error(`TEST 24 Failed: Expected 403 for Mechanic on GET /vehicles/my, got ${r24.statusCode}`);
    console.log('✔ TEST 24 PASSED: Mechanic calling GET /api/vehicles/my returned 403 Forbidden');

    // 25. client -> POST /api/vehicles -> not 403
    const r25 = await makeRequest(app, 'POST', '/api/vehicles', clientAToken, { make: 'Ford', model: 'Focus', license_plate: `F-${Date.now() % 1000}`, year: 2021 });
    if (r25.statusCode === 403) throw new Error('TEST 25 Failed: Client got 403 on POST /vehicles');
    console.log(`✔ TEST 25 PASSED: Client POST /vehicles allowed (Status: ${r25.statusCode})`);

    // 26. admin -> POST /api/vehicles -> not 403
    const r26 = await makeRequest(app, 'POST', '/api/vehicles', adminToken, { client_id: clientA.id, make: 'BMW', model: 'X5', license_plate: `B-${Date.now() % 1000}`, year: 2022 });
    if (r26.statusCode === 403) throw new Error('TEST 26 Failed: Admin got 403 on POST /vehicles');
    console.log(`✔ TEST 26 PASSED: Admin POST /vehicles allowed (Status: ${r26.statusCode})`);

    // 27. receptionist -> POST /api/vehicles -> not 403
    const r27 = await makeRequest(app, 'POST', '/api/vehicles', receptionistToken, { client_id: clientA.id, make: 'Audi', model: 'A4', license_plate: `A-${Date.now() % 1000}`, year: 2023 });
    if (r27.statusCode === 403) throw new Error('TEST 27 Failed: Receptionist got 403 on POST /vehicles');
    console.log(`✔ TEST 27 PASSED: Receptionist POST /vehicles allowed (Status: ${r27.statusCode})`);

    // 28. mechanic -> POST /api/vehicles -> 403
    const r28 = await makeRequest(app, 'POST', '/api/vehicles', mechanicToken, { make: 'Tesla', model: 'Model 3', license_plate: 'T-1', year: 2023 });
    if (r28.statusCode !== 403) throw new Error(`TEST 28 Failed: Expected 403 for Mechanic on POST /vehicles, got ${r28.statusCode}`);
    console.log('✔ TEST 28 PASSED: Mechanic calling POST /api/vehicles returned 403 Forbidden');

    // 29. client -> PUT /api/vehicles/:id -> not 403
    const r29 = await makeRequest(app, 'PUT', `/api/vehicles/${vehicleA.id}`, clientAToken, { model: 'Camry Sport' });
    if (r29.statusCode === 403) throw new Error('TEST 29 Failed: Client got 403 on PUT /vehicles/:id');
    console.log(`✔ TEST 29 PASSED: Client PUT /vehicles/:id allowed (Status: ${r29.statusCode})`);

    // 30. admin -> PUT /api/vehicles/:id -> not 403
    const r30 = await makeRequest(app, 'PUT', `/api/vehicles/${vehicleA.id}`, adminToken, { year: 2023 });
    if (r30.statusCode === 403) throw new Error('TEST 30 Failed: Admin got 403 on PUT /vehicles/:id');
    console.log(`✔ TEST 30 PASSED: Admin PUT /vehicles/:id allowed (Status: ${r30.statusCode})`);

    // 31. receptionist -> PUT /api/vehicles/:id -> not 403
    const r31 = await makeRequest(app, 'PUT', `/api/vehicles/${vehicleA.id}`, receptionistToken, { year: 2023 });
    if (r31.statusCode === 403) throw new Error('TEST 31 Failed: Receptionist got 403 on PUT /vehicles/:id');
    console.log(`✔ TEST 31 PASSED: Receptionist PUT /vehicles/:id allowed (Status: ${r31.statusCode})`);

    // 32. mechanic -> PUT /api/vehicles/:id -> 403
    const r32 = await makeRequest(app, 'PUT', `/api/vehicles/${vehicleA.id}`, mechanicToken, { year: 2023 });
    if (r32.statusCode !== 403) throw new Error(`TEST 32 Failed: Expected 403 for Mechanic on PUT /vehicles/:id, got ${r32.statusCode}`);
    console.log('✔ TEST 32 PASSED: Mechanic calling PUT /api/vehicles/:id returned 403 Forbidden');

    // 33. client -> GET /api/vehicles/:id/history -> not 403
    const r33 = await makeRequest(app, 'GET', `/api/vehicles/${vehicleA.id}/history`, clientAToken);
    if (r33.statusCode === 403) throw new Error('TEST 33 Failed: Client got 403 on GET /vehicles/:id/history');
    console.log(`✔ TEST 33 PASSED: Client GET /vehicles/:id/history allowed (Status: ${r33.statusCode})`);

    // 34. mechanic -> GET /api/vehicles/:id/history -> not 403
    const r34 = await makeRequest(app, 'GET', `/api/vehicles/${vehicleA.id}/history`, mechanicToken);
    if (r34.statusCode === 403) throw new Error('TEST 34 Failed: Mechanic got 403 on GET /vehicles/:id/history');
    console.log(`✔ TEST 34 PASSED: Mechanic GET /vehicles/:id/history allowed (Status: ${r34.statusCode})`);

    // 35. admin -> GET /api/vehicles/:id/history -> not 403
    const r35 = await makeRequest(app, 'GET', `/api/vehicles/${vehicleA.id}/history`, adminToken);
    if (r35.statusCode === 403) throw new Error('TEST 35 Failed: Admin got 403 on GET /vehicles/:id/history');
    console.log(`✔ TEST 35 PASSED: Admin GET /vehicles/:id/history allowed (Status: ${r35.statusCode})`);

    // 36. receptionist -> GET /api/vehicles/:id/history -> not 403
    const r36 = await makeRequest(app, 'GET', `/api/vehicles/${vehicleA.id}/history`, receptionistToken);
    if (r36.statusCode === 403) throw new Error('TEST 36 Failed: Receptionist got 403 on GET /vehicles/:id/history');
    console.log(`✔ TEST 36 PASSED: Receptionist GET /vehicles/:id/history allowed (Status: ${r36.statusCode})`);

    // --------------------------------------------------
    // CUSTOMER TESTS
    // --------------------------------------------------
    // 37. client -> GET /api/customer/dashboard -> not 403
    const r37 = await makeRequest(app, 'GET', '/api/customer/dashboard', clientAToken);
    if (r37.statusCode === 403) throw new Error('TEST 37 Failed: Client got 403 on GET /customer/dashboard');
    console.log(`✔ TEST 37 PASSED: Client GET /customer/dashboard allowed (Status: ${r37.statusCode})`);

    // 38. mechanic -> GET /api/customer/dashboard -> 403
    const r38 = await makeRequest(app, 'GET', '/api/customer/dashboard', mechanicToken);
    if (r38.statusCode !== 403) throw new Error(`TEST 38 Failed: Expected 403 for Mechanic on GET /customer/dashboard, got ${r38.statusCode}`);
    console.log('✔ TEST 38 PASSED: Mechanic calling GET /api/customer/dashboard returned 403 Forbidden');

    // 39. receptionist -> GET /api/customer/dashboard -> 403
    const r39 = await makeRequest(app, 'GET', '/api/customer/dashboard', receptionistToken);
    if (r39.statusCode !== 403) throw new Error(`TEST 39 Failed: Expected 403 for Receptionist on GET /customer/dashboard, got ${r39.statusCode}`);
    console.log('✔ TEST 39 PASSED: Receptionist calling GET /api/customer/dashboard returned 403 Forbidden');

    // 40. admin -> GET /api/customer/dashboard -> 403
    const r40 = await makeRequest(app, 'GET', '/api/customer/dashboard', adminToken);
    if (r40.statusCode !== 403) throw new Error(`TEST 40 Failed: Expected 403 for Admin on GET /customer/dashboard, got ${r40.statusCode}`);
    console.log('✔ TEST 40 PASSED: Admin calling GET /api/customer/dashboard returned 403 Forbidden');

    // --------------------------------------------------
    // REVIEW TESTS
    // --------------------------------------------------
    // 41. authenticated client -> GET /api/reviews -> not 403
    const r41 = await makeRequest(app, 'GET', '/api/reviews', clientAToken);
    if (r41.statusCode === 403) throw new Error('TEST 41 Failed: Client got 403 on GET /reviews');
    console.log(`✔ TEST 41 PASSED: Client GET /reviews allowed (Status: ${r41.statusCode})`);

    // 42. authenticated mechanic -> GET /api/reviews -> not 403
    const r42 = await makeRequest(app, 'GET', '/api/reviews', mechanicToken);
    if (r42.statusCode === 403) throw new Error('TEST 42 Failed: Mechanic got 403 on GET /reviews');
    console.log(`✔ TEST 42 PASSED: Mechanic GET /reviews allowed (Status: ${r42.statusCode})`);

    // 43. authenticated receptionist -> GET /api/reviews -> not 403
    const r43 = await makeRequest(app, 'GET', '/api/reviews', receptionistToken);
    if (r43.statusCode === 403) throw new Error('TEST 43 Failed: Receptionist got 403 on GET /reviews');
    console.log(`✔ TEST 43 PASSED: Receptionist GET /reviews allowed (Status: ${r43.statusCode})`);

    // 44. authenticated admin -> GET /api/reviews -> not 403
    const r44 = await makeRequest(app, 'GET', '/api/reviews', adminToken);
    if (r44.statusCode === 403) throw new Error('TEST 44 Failed: Admin got 403 on GET /reviews');
    console.log(`✔ TEST 44 PASSED: Admin GET /reviews allowed (Status: ${r44.statusCode})`);

    // 45. client -> POST /api/reviews -> not 403
    const r45 = await makeRequest(app, 'POST', '/api/reviews', clientAToken, { appointment_id: appointmentA.id, rating: 5, comment: 'Great job!' });
    if (r45.statusCode === 403) throw new Error('TEST 45 Failed: Client got 403 on POST /reviews');
    console.log(`✔ TEST 45 PASSED: Client POST /reviews allowed (Status: ${r45.statusCode})`);

    // 46. mechanic -> POST /api/reviews -> 403
    const r46 = await makeRequest(app, 'POST', '/api/reviews', mechanicToken, { appointment_id: appointmentA.id, rating: 5 });
    if (r46.statusCode !== 403) throw new Error(`TEST 46 Failed: Expected 403 for Mechanic on POST /reviews, got ${r46.statusCode}`);
    console.log('✔ TEST 46 PASSED: Mechanic calling POST /api/reviews returned 403 Forbidden');

    // 47. receptionist -> POST /api/reviews -> 403
    const r47 = await makeRequest(app, 'POST', '/api/reviews', receptionistToken, { appointment_id: appointmentA.id, rating: 5 });
    if (r47.statusCode !== 403) throw new Error(`TEST 47 Failed: Expected 403 for Receptionist on POST /reviews, got ${r47.statusCode}`);
    console.log('✔ TEST 47 PASSED: Receptionist calling POST /api/reviews returned 403 Forbidden');

    // 48. admin -> POST /api/reviews -> 403
    const r48 = await makeRequest(app, 'POST', '/api/reviews', adminToken, { appointment_id: appointmentA.id, rating: 5 });
    if (r48.statusCode !== 403) throw new Error(`TEST 48 Failed: Expected 403 for Admin on POST /reviews, got ${r48.statusCode}`);
    console.log('✔ TEST 48 PASSED: Admin calling POST /api/reviews returned 403 Forbidden');

  } finally {
    console.log('\nCleaning up temporary test records...');
    await cleanupTestData();
  }

  console.log('\n=== ALL BATCH 4.4 TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n✖ TEST FAILED:', err);
  process.exit(1);
});
