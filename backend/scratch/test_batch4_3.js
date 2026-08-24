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
const { sequelize, User, Vehicle, Appointment, TechnicalReport, SparePart, RequiredPart } = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/models');
const appointmentRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/appointmentRoutes');
const technicalReportRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/technicalReportRoutes');
const requiredPartRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/requiredPartRoutes');

const app = express();
app.use(express.json());
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', technicalReportRoutes);
app.use('/api/required-parts', requiredPartRoutes);

const secret = process.env.JWT_SECRET || 'safwa_secret_key';

let testClient, testMechanic, testAdmin, testVehicle, testAppointment, testReport, testPart;
let clientToken, mechanicToken, receptionistToken, adminToken;

async function makeRequest(server, method, url, token = null, body = null) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      headers: {
        'content-type': 'application/json'
      },
      body: body || {}
    };
    if (token) {
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
  testClient = await User.create({
    name: 'Batch 4.3 Client',
    email: `client_b43_${ts}@safwa.sa`,
    password: 'hash',
    role: 'client',
    status: 'active'
  });

  testMechanic = await User.create({
    name: 'Batch 4.3 Mechanic',
    email: `mechanic_b43_${ts}@safwa.sa`,
    password: 'hash',
    role: 'mechanic',
    status: 'active'
  });

  testAdmin = await User.create({
    name: 'Batch 4.3 Admin',
    email: `admin_b43_${ts}@safwa.sa`,
    password: 'hash',
    role: 'admin',
    status: 'active'
  });

  testVehicle = await Vehicle.create({
    client_id: testClient.id,
    make: 'Toyota',
    model: 'Camry',
    license_plate: `B43-${ts % 10000}`,
    year: 2022
  });

  testAppointment = await Appointment.create({
    client_id: testClient.id,
    vehicle_id: testVehicle.id,
    mechanic_id: testMechanic.id,
    appointment_date: new Date(),
    status: 'pending',
    problem_description: 'Batch 4.3 Test Problem Description',
    notes: 'Batch 4.3 Test Appointment'
  });

  testReport = await TechnicalReport.create({
    appointment_id: testAppointment.id,
    mechanic_id: testMechanic.id,
    diagnostics: 'Initial engine check',
    diagnostic_notes: 'Initial check',
    visual_notes: 'Clean'
  });

  testPart = await SparePart.create({
    name: 'Batch 4.3 Brake Pad',
    part_number: `BP-${ts}`,
    brand: 'Toyota',
    price: 150,
    stock_quantity: 10,
    min_stock_level: 2
  });

  clientToken = jwt.sign({ id: testClient.id, role: 'client', email: testClient.email }, secret);
  mechanicToken = jwt.sign({ id: testMechanic.id, role: 'mechanic', email: testMechanic.email }, secret);
  receptionistToken = jwt.sign({ id: 999, role: 'receptionist', email: 'receptionist_b43@safwa.sa' }, secret);
  adminToken = jwt.sign({ id: testAdmin.id, role: 'admin', email: testAdmin.email }, secret);
}

async function cleanupTestData() {
  try {
    if (testVehicle?.id) {
      const appointments = await Appointment.findAll({ where: { vehicle_id: testVehicle.id } });
      for (const appt of appointments) {
        const reports = await TechnicalReport.findAll({ where: { appointment_id: appt.id } });
        for (const r of reports) {
          await RequiredPart.destroy({ where: { technical_report_id: r.id } });
        }
        await TechnicalReport.destroy({ where: { appointment_id: appt.id } });
        await Appointment.destroy({ where: { id: appt.id } });
      }
      await Vehicle.destroy({ where: { id: testVehicle.id } });
    }
    if (testPart?.id) await SparePart.destroy({ where: { id: testPart.id } });
    if (testClient?.id) await User.destroy({ where: { id: testClient.id } });
    if (testMechanic?.id) await User.destroy({ where: { id: testMechanic.id } });
    if (testAdmin?.id) await User.destroy({ where: { id: testAdmin.id } });
    console.log('✔ Database clean: Temporary test data deleted successfully.');
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

async function runTests() {
  console.log('=== BATCH 4.3 RBAC INTEGRATION TESTS ===\n');

  try {
    await sequelize.authenticate();
    console.log('✔ DB Connection: SUCCESS');

    await setupTestData();
    console.log('✔ Test Data Setup: SUCCESS');

    // AUTHENTICATION TESTS
    // 1. No token -> 401
    const r1 = await makeRequest(app, 'GET', '/api/appointments');
    if (r1.statusCode !== 401) throw new Error(`TEST 1 Failed: Expected 401, got ${r1.statusCode}`);
    console.log('✔ TEST 1 PASSED: Request with No Token returned 401');

    // 2. Invalid token -> 401
    const r2 = await makeRequest(app, 'GET', '/api/appointments', 'invalid.token.str');
    if (r2.statusCode !== 401) throw new Error(`TEST 2 Failed: Expected 401, got ${r2.statusCode}`);
    console.log('✔ TEST 2 PASSED: Request with Invalid Token returned 401');

    // APPOINTMENT ROUTES TESTS
    // 3. Client POST /api/appointments -> allowed (not 403)
    const r3 = await makeRequest(app, 'POST', '/api/appointments', clientToken, {
      vehicle_id: testVehicle.id,
      appointment_date: new Date(),
      problem_description: 'Oil check',
      notes: 'Client booking'
    });
    if (r3.statusCode === 403) throw new Error(`TEST 3 Failed: Client got 403 on POST /appointments`);
    console.log(`✔ TEST 3 PASSED: Client POST /appointments allowed (Status: ${r3.statusCode})`);

    // 4. Admin POST /api/appointments -> allowed (not 403)
    const r4 = await makeRequest(app, 'POST', '/api/appointments', adminToken, {
      vehicle_id: testVehicle.id,
      appointment_date: new Date(),
      problem_description: 'Admin oil check',
      notes: 'Admin booking'
    });
    if (r4.statusCode === 403) throw new Error(`TEST 4 Failed: Admin got 403 on POST /appointments`);
    console.log(`✔ TEST 4 PASSED: Admin POST /appointments allowed (Status: ${r4.statusCode})`);

    // 5. Receptionist POST /api/appointments -> allowed (not 403)
    const r5 = await makeRequest(app, 'POST', '/api/appointments', receptionistToken, {
      vehicle_id: testVehicle.id,
      appointment_date: new Date(),
      problem_description: 'Receptionist oil check',
      notes: 'Receptionist booking'
    });
    if (r5.statusCode === 403) throw new Error(`TEST 5 Failed: Receptionist got 403 on POST /appointments`);
    console.log(`✔ TEST 5 PASSED: Receptionist POST /appointments allowed (Status: ${r5.statusCode})`);

    // 6. Mechanic POST /api/appointments -> 403
    const r6 = await makeRequest(app, 'POST', '/api/appointments', mechanicToken, {
      vehicle_id: testVehicle.id,
      appointment_date: new Date(),
      problem_description: 'Mechanic booking attempt'
    });
    if (r6.statusCode !== 403) throw new Error(`TEST 6 Failed: Expected 403 for Mechanic on POST /appointments, got ${r6.statusCode}`);
    console.log('✔ TEST 6 PASSED: Mechanic calling POST /api/appointments returned 403 Forbidden');

    // 7. Client GET /api/appointments (all) -> 403
    const r7 = await makeRequest(app, 'GET', '/api/appointments', clientToken);
    if (r7.statusCode !== 403) throw new Error(`TEST 7 Failed: Expected 403 for Client on GET /appointments, got ${r7.statusCode}`);
    console.log('✔ TEST 7 PASSED: Client calling GET /api/appointments returned 403 Forbidden');

    // 8. Admin GET /api/appointments -> 200
    const r8 = await makeRequest(app, 'GET', '/api/appointments', adminToken);
    if (r8.statusCode !== 200) throw new Error(`TEST 8 Failed: Expected 200 for Admin on GET /appointments, got ${r8.statusCode}`);
    console.log('✔ TEST 8 PASSED: Admin calling GET /api/appointments returned 200 OK');

    // 9. Receptionist GET /api/appointments -> 200
    const r9 = await makeRequest(app, 'GET', '/api/appointments', receptionistToken);
    if (r9.statusCode !== 200) throw new Error(`TEST 9 Failed: Expected 200 for Receptionist on GET /appointments, got ${r9.statusCode}`);
    console.log('✔ TEST 9 PASSED: Receptionist calling GET /api/appointments returned 200 OK');

    // 10. Mechanic GET /api/appointments/assigned -> allowed (not 403)
    const r10 = await makeRequest(app, 'GET', '/api/appointments/assigned', mechanicToken);
    if (r10.statusCode === 403) throw new Error(`TEST 10 Failed: Mechanic got 403 on GET /appointments/assigned`);
    console.log(`✔ TEST 10 PASSED: Mechanic GET /appointments/assigned allowed (Status: ${r10.statusCode})`);

    // 11. Client GET /api/appointments/my -> allowed (not 403)
    const r11 = await makeRequest(app, 'GET', '/api/appointments/my', clientToken);
    if (r11.statusCode === 403) throw new Error(`TEST 11 Failed: Client got 403 on GET /appointments/my`);
    console.log(`✔ TEST 11 PASSED: Client GET /appointments/my allowed (Status: ${r11.statusCode})`);

    // 12. Client PUT /api/appointments/:id -> 403
    const r12 = await makeRequest(app, 'PUT', `/api/appointments/${testAppointment.id}`, clientToken, { status: 'completed' });
    if (r12.statusCode !== 403) throw new Error(`TEST 12 Failed: Expected 403 for Client on PUT /appointments/:id, got ${r12.statusCode}`);
    console.log('✔ TEST 12 PASSED: Client calling PUT /api/appointments/:id returned 403 Forbidden');

    // 13. Mechanic PUT /api/appointments/:id -> allowed (not 403)
    const r13 = await makeRequest(app, 'PUT', `/api/appointments/${testAppointment.id}`, mechanicToken, { status: 'in-progress' });
    if (r13.statusCode === 403) throw new Error(`TEST 13 Failed: Mechanic got 403 on PUT /appointments/:id`);
    console.log(`✔ TEST 13 PASSED: Mechanic PUT /appointments/:id allowed (Status: ${r13.statusCode})`);

    // 14. Receptionist PUT /api/appointments/:id -> allowed (not 403)
    const r14 = await makeRequest(app, 'PUT', `/api/appointments/${testAppointment.id}`, receptionistToken, { status: 'confirmed' });
    if (r14.statusCode === 403) throw new Error(`TEST 14 Failed: Receptionist got 403 on PUT /appointments/:id`);
    console.log(`✔ TEST 14 PASSED: Receptionist PUT /appointments/:id allowed (Status: ${r14.statusCode})`);

    // TECHNICAL REPORTS TESTS
    // 15. Client POST /api/reports -> 403
    const r15 = await makeRequest(app, 'POST', '/api/reports', clientToken, { appointment_id: testAppointment.id, diagnostics: 'D' });
    if (r15.statusCode !== 403) throw new Error(`TEST 15 Failed: Expected 403 for Client on POST /reports, got ${r15.statusCode}`);
    console.log('✔ TEST 15 PASSED: Client calling POST /api/reports returned 403 Forbidden');

    // 16. Receptionist POST /api/reports -> 403
    const r16 = await makeRequest(app, 'POST', '/api/reports', receptionistToken, { appointment_id: testAppointment.id, diagnostics: 'D' });
    if (r16.statusCode !== 403) throw new Error(`TEST 16 Failed: Expected 403 for Receptionist on POST /reports, got ${r16.statusCode}`);
    console.log('✔ TEST 16 PASSED: Receptionist calling POST /api/reports returned 403 Forbidden');

    // 17. Mechanic POST /api/reports -> allowed (not 403)
    const r17 = await makeRequest(app, 'POST', '/api/reports', mechanicToken, {
      appointment_id: testAppointment.id,
      diagnostics: 'Brake inspect',
      diagnostic_notes: 'Brake inspect',
      visual_notes: 'Normal wear'
    });
    if (r17.statusCode === 403) throw new Error(`TEST 17 Failed: Mechanic got 403 on POST /reports`);
    console.log(`✔ TEST 17 PASSED: Mechanic POST /reports allowed (Status: ${r17.statusCode})`);

    // 18. Admin POST /api/reports -> allowed (not 403)
    const r18 = await makeRequest(app, 'POST', '/api/reports', adminToken, {
      appointment_id: testAppointment.id,
      diagnostics: 'Admin check',
      diagnostic_notes: 'Admin check'
    });
    if (r18.statusCode === 403) throw new Error(`TEST 18 Failed: Admin got 403 on POST /reports`);
    console.log(`✔ TEST 18 PASSED: Admin POST /reports allowed (Status: ${r18.statusCode})`);

    // REQUIRED PARTS TESTS
    // 19. Client POST /api/required-parts -> 403
    const r19 = await makeRequest(app, 'POST', '/api/required-parts', clientToken, { appointment_id: testAppointment.id, parts: [{ id: testPart.id, qty: 1 }] });
    if (r19.statusCode !== 403) throw new Error(`TEST 19 Failed: Expected 403 for Client on POST /required-parts, got ${r19.statusCode}`);
    console.log('✔ TEST 19 PASSED: Client calling POST /api/required-parts returned 403 Forbidden');

    // 20. Receptionist POST /api/required-parts -> 403
    const r20 = await makeRequest(app, 'POST', '/api/required-parts', receptionistToken, { appointment_id: testAppointment.id, parts: [{ id: testPart.id, qty: 1 }] });
    if (r20.statusCode !== 403) throw new Error(`TEST 20 Failed: Expected 403 for Receptionist on POST /required-parts, got ${r20.statusCode}`);
    console.log('✔ TEST 20 PASSED: Receptionist calling POST /api/required-parts returned 403 Forbidden');

    // 21. Mechanic POST /api/required-parts -> allowed (not 403)
    const r21 = await makeRequest(app, 'POST', '/api/required-parts', mechanicToken, {
      appointment_id: testAppointment.id,
      parts: [{ id: testPart.id, qty: 2 }]
    });
    if (r21.statusCode === 403) throw new Error(`TEST 21 Failed: Mechanic got 403 on POST /required-parts`);
    console.log(`✔ TEST 21 PASSED: Mechanic POST /required-parts allowed (Status: ${r21.statusCode})`);

    // 22. Admin POST /api/required-parts -> allowed (not 403)
    const r22 = await makeRequest(app, 'POST', '/api/required-parts', adminToken, {
      appointment_id: testAppointment.id,
      parts: [{ id: testPart.id, qty: 1 }]
    });
    if (r22.statusCode === 403) throw new Error(`TEST 22 Failed: Admin got 403 on POST /required-parts`);
    console.log(`✔ TEST 22 PASSED: Admin POST /required-parts allowed (Status: ${r22.statusCode})`);

    // 23. Client PUT /api/required-parts/approval -> 403
    const r23 = await makeRequest(app, 'PUT', '/api/required-parts/approval', clientToken, { decisions: [{ id: 1, status: 'approved' }] });
    if (r23.statusCode !== 403) throw new Error(`TEST 23 Failed: Expected 403 for Client on PUT /required-parts/approval, got ${r23.statusCode}`);
    console.log('✔ TEST 23 PASSED: Client calling PUT /api/required-parts/approval returned 403 Forbidden');

    // 24. Mechanic PUT /api/required-parts/approval -> 403
    const r24 = await makeRequest(app, 'PUT', '/api/required-parts/approval', mechanicToken, { decisions: [{ id: 1, status: 'approved' }] });
    if (r24.statusCode !== 403) throw new Error(`TEST 24 Failed: Expected 403 for Mechanic on PUT /required-parts/approval, got ${r24.statusCode}`);
    console.log('✔ TEST 24 PASSED: Mechanic calling PUT /api/required-parts/approval returned 403 Forbidden');

    // 25. Receptionist PUT /api/required-parts/approval -> allowed (not 403)
    const r25 = await makeRequest(app, 'PUT', '/api/required-parts/approval', receptionistToken, { decisions: [{ id: 1, status: 'approved' }] });
    if (r25.statusCode === 403) throw new Error(`TEST 25 Failed: Receptionist got 403 on PUT /required-parts/approval`);
    console.log(`✔ TEST 25 PASSED: Receptionist PUT /required-parts/approval allowed (Status: ${r25.statusCode})`);

    // 26. Admin PUT /api/required-parts/approval -> allowed (not 403)
    const r26 = await makeRequest(app, 'PUT', '/api/required-parts/approval', adminToken, { decisions: [{ id: 1, status: 'approved' }] });
    if (r26.statusCode === 403) throw new Error(`TEST 26 Failed: Admin got 403 on PUT /required-parts/approval`);
    console.log(`✔ TEST 26 PASSED: Admin PUT /required-parts/approval allowed (Status: ${r26.statusCode})`);

  } finally {
    console.log('\nCleaning up temporary test records...');
    await cleanupTestData();
  }

  console.log('\n=== ALL BATCH 4.3 TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n✖ TEST FAILED:', err);
  process.exit(1);
});
