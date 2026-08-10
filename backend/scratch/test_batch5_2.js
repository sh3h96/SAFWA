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
  TechnicalReport
} = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/models');

const appointmentRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/appointmentRoutes');
const technicalReportRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/technicalReportRoutes');

const app = express();
app.use(express.json());
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', technicalReportRoutes);

const secret = process.env.JWT_SECRET || 'safwa_secret_key';

let clientA, clientB, adminUser, receptionistUser, mechanicA, mechanicB;
let vehicleA, vehicleB;
let appointmentA, appointmentB, appointmentUnassigned;
let reportCreatedIds = [];

let clientAToken, clientBToken, adminToken, receptionistToken, mechanicAToken, mechanicBToken;

async function makeRequest(server, method, url, token = null, body = null, rawAuthHeader = null) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      headers: {
        'content-type': 'application/json'
      },
      body: body || {},
      query: {},
      params: {}
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
    name: 'Batch 5.2 Client A',
    email: `clienta_b52_${ts}@safwa.sa`,
    password: 'hash',
    role: 'client',
    status: 'active'
  });

  clientB = await User.create({
    name: 'Batch 5.2 Client B',
    email: `clientb_b52_${ts}@safwa.sa`,
    password: 'hash',
    role: 'client',
    status: 'active'
  });

  adminUser = await User.create({
    name: 'Batch 5.2 Admin',
    email: `admin_b52_${ts}@safwa.sa`,
    password: 'hash',
    role: 'admin',
    status: 'active'
  });

  receptionistUser = await User.create({
    name: 'Batch 5.2 Receptionist',
    email: `receptionist_b52_${ts}@safwa.sa`,
    password: 'hash',
    role: 'receptionist',
    status: 'active'
  });

  mechanicA = await User.create({
    name: 'Batch 5.2 Mechanic A',
    email: `mechanica_b52_${ts}@safwa.sa`,
    password: 'hash',
    role: 'mechanic',
    status: 'active'
  });

  mechanicB = await User.create({
    name: 'Batch 5.2 Mechanic B',
    email: `mechanicb_b52_${ts}@safwa.sa`,
    password: 'hash',
    role: 'mechanic',
    status: 'active'
  });

  vehicleA = await Vehicle.create({
    client_id: clientA.id,
    make: 'Toyota',
    model: 'Avalon',
    license_plate: `B52A-${ts % 10000}`,
    year: 2021
  });

  vehicleB = await Vehicle.create({
    client_id: clientB.id,
    make: 'Hyundai',
    model: 'Sonata',
    license_plate: `B52B-${ts % 10000}`,
    year: 2022
  });

  appointmentA = await Appointment.create({
    client_id: clientA.id,
    vehicle_id: vehicleA.id,
    mechanic_id: mechanicA.id,
    scheduled_date: new Date('2026-08-10T10:00:00Z'),
    status: 'in_progress',
    problem_description: 'Engine Noise Check'
  });

  appointmentB = await Appointment.create({
    client_id: clientB.id,
    vehicle_id: vehicleB.id,
    mechanic_id: mechanicB.id,
    scheduled_date: new Date('2026-08-10T12:00:00Z'),
    status: 'in_progress',
    problem_description: 'Transmission Fluid Leak'
  });

  appointmentUnassigned = await Appointment.create({
    client_id: clientA.id,
    vehicle_id: vehicleA.id,
    mechanic_id: null,
    scheduled_date: new Date('2026-08-10T14:00:00Z'),
    status: 'pending',
    problem_description: 'Unassigned Oil Change'
  });

  clientAToken = jwt.sign({ id: clientA.id, role: 'client', email: clientA.email }, secret);
  clientBToken = jwt.sign({ id: clientB.id, role: 'client', email: clientB.email }, secret);
  adminToken = jwt.sign({ id: adminUser.id, role: 'admin', email: adminUser.email }, secret);
  receptionistToken = jwt.sign({ id: receptionistUser.id, role: 'receptionist', email: receptionistUser.email }, secret);
  mechanicAToken = jwt.sign({ id: mechanicA.id, role: 'mechanic', email: mechanicA.email }, secret);
  mechanicBToken = jwt.sign({ id: mechanicB.id, role: 'mechanic', email: mechanicB.email }, secret);
}

async function cleanupTestData() {
  try {
    const userIds = [clientA?.id, clientB?.id, adminUser?.id, receptionistUser?.id, mechanicA?.id, mechanicB?.id].filter(Boolean);
    if (userIds.length > 0) {
      if (reportCreatedIds.length > 0) {
        await TechnicalReport.destroy({ where: { id: reportCreatedIds } });
      }
      const vList = await Vehicle.findAll({ where: { client_id: userIds } });
      const vIds = vList.map(v => v.id);

      if (vIds.length > 0) {
        const appts = await Appointment.findAll({ where: { vehicle_id: vIds } });
        const apptIds = appts.map(a => a.id);

        if (apptIds.length > 0) {
          await TechnicalReport.destroy({ where: { appointment_id: apptIds } });
          await Appointment.destroy({ where: { id: apptIds } });
        }
        await Vehicle.destroy({ where: { id: vIds } });
      }
      await User.destroy({ where: { id: userIds } });
    }

    // Verify DB count
    const remainingUsers = await User.count({ where: { email: { [require('sequelize').Op.like]: '%_b52_%' } } });
    const remainingVehicles = await Vehicle.count({ where: { license_plate: { [require('sequelize').Op.like]: '%B52%' } } });
    const remainingAppts = await Appointment.count({ where: { problem_description: ['Engine Noise Check', 'Transmission Fluid Leak', 'Unassigned Oil Change'] } });
    const remainingReports = await TechnicalReport.count({ where: { id: reportCreatedIds } });

    console.log('\n--- DB CLEANUP VERIFICATION METRICS ---');
    console.log(`Users remaining: ${remainingUsers}`);
    console.log(`Vehicles remaining: ${remainingVehicles}`);
    console.log(`Appointments remaining: ${remainingAppts}`);
    console.log(`Technical Reports remaining: ${remainingReports}`);
    console.log('----------------------------------------');

  } catch (err) {
    console.error('Cleanup warning:', err.message);
  }
}

async function runTests() {
  console.log('=== BATCH 5.2 TECHNICAL & APPOINTMENT CONTROLLERS HARDENING TESTS ===\n');

  try {
    await sequelize.authenticate();
    console.log('✔ DB Connection: SUCCESS');

    await setupTestData();
    console.log('✔ Test Data Setup: SUCCESS\n');

    // SECTION 1: APPOINTMENT OWNERSHIP (GET /api/appointments/:id)
    // TEST 1: Client A -> Own Appointment -> 200
    const r1 = await makeRequest(app, 'GET', `/api/appointments/${appointmentA.id}`, clientAToken);
    if (r1.statusCode !== 200 || r1.body.id !== appointmentA.id) throw new Error(`TEST 1 Failed: Client A accessing own appointment returned ${r1.statusCode}`);
    console.log('✔ TEST 1 PASSED: Client A requesting own appointment returned HTTP 200');

    // TEST 2: Client A -> Client B Appointment -> 404
    const r2 = await makeRequest(app, 'GET', `/api/appointments/${appointmentB.id}`, clientAToken);
    if (r2.statusCode !== 404) throw new Error(`TEST 2 Failed: Client A accessing Client B appointment returned ${r2.statusCode}`);
    console.log('✔ TEST 2 PASSED: Client A requesting Client B appointment returned HTTP 404 Not Found');

    // TEST 3: Admin -> Client Appointment -> 200
    const r3 = await makeRequest(app, 'GET', `/api/appointments/${appointmentA.id}`, adminToken);
    if (r3.statusCode !== 200) throw new Error(`TEST 3 Failed: Admin accessing appointment returned ${r3.statusCode}`);
    console.log('✔ TEST 3 PASSED: Admin requesting client appointment returned HTTP 200');

    // TEST 4: Receptionist -> Client Appointment -> 200
    const r4 = await makeRequest(app, 'GET', `/api/appointments/${appointmentA.id}`, receptionistToken);
    if (r4.statusCode !== 200) throw new Error(`TEST 4 Failed: Receptionist accessing appointment returned ${r4.statusCode}`);
    console.log('✔ TEST 4 PASSED: Receptionist requesting client appointment returned HTTP 200');

    // TEST 5: Mechanic A -> Assigned Appointment A -> 200
    const r5 = await makeRequest(app, 'GET', `/api/appointments/${appointmentA.id}`, mechanicAToken);
    if (r5.statusCode !== 200) throw new Error(`TEST 5 Failed: Mechanic A accessing assigned appointment returned ${r5.statusCode}`);
    console.log('✔ TEST 5 PASSED: Mechanic A requesting assigned appointment returned HTTP 200');

    // TEST 6: Mechanic A -> Appointment B (Assigned to Mechanic B) -> 404
    const r6 = await makeRequest(app, 'GET', `/api/appointments/${appointmentB.id}`, mechanicAToken);
    if (r6.statusCode !== 404) throw new Error(`TEST 6 Failed: Mechanic A accessing Mechanic B appointment returned ${r6.statusCode}`);
    console.log('✔ TEST 6 PASSED: Mechanic A requesting appointment assigned to Mechanic B returned HTTP 404 Not Found');

    // TEST 7: Mechanic A -> Unassigned Appointment -> 404
    const r7 = await makeRequest(app, 'GET', `/api/appointments/${appointmentUnassigned.id}`, mechanicAToken);
    if (r7.statusCode !== 404) throw new Error(`TEST 7 Failed: Mechanic A accessing unassigned appointment returned ${r7.statusCode}`);
    console.log('✔ TEST 7 PASSED: Mechanic A requesting unassigned appointment returned HTTP 404 Not Found');

    // SECTION 2: APPOINTMENT UPDATE & MECHANIC FIELD RESTRICTIONS (PUT /api/appointments/:id)
    // TEST 8: Client -> PUT appointment -> 403 (RBAC)
    const r8 = await makeRequest(app, 'PUT', `/api/appointments/${appointmentA.id}`, clientAToken, { status: 'completed' });
    if (r8.statusCode !== 403) throw new Error(`TEST 8 Failed: Client PUT appointment returned ${r8.statusCode}`);
    console.log('✔ TEST 8 PASSED: Client attempting PUT appointment rejected with HTTP 403 Forbidden');

    // TEST 9: Assigned Mechanic A -> PUT status to 'completed' -> 200 & DB Verification
    const r9 = await makeRequest(app, 'PUT', `/api/appointments/${appointmentA.id}`, mechanicAToken, { status: 'completed' });
    if (r9.statusCode !== 200) throw new Error(`TEST 9 Failed: Assigned Mechanic A PUT appointment returned ${r9.statusCode}`);
    let fresh9 = await Appointment.findOne({ where: { id: appointmentA.id }, raw: true });
    if (fresh9.status !== 'completed') throw new Error(`TEST 9 Failed: DB status was ${fresh9.status}, expected completed`);
    console.log('✔ TEST 9 PASSED: Assigned Mechanic A updating status returned HTTP 200 and updated DB status');

    // TEST 10: Mechanic A -> PUT appointment B (assigned to Mechanic B) -> 404
    const r10 = await makeRequest(app, 'PUT', `/api/appointments/${appointmentB.id}`, mechanicAToken, { status: 'completed' });
    if (r10.statusCode !== 404) throw new Error(`TEST 10 Failed: Mechanic A updating Mechanic B appointment returned ${r10.statusCode}`);
    console.log('✔ TEST 10 PASSED: Mechanic A updating appointment assigned to Mechanic B returned HTTP 404 Not Found');

    // TEST 11a: Mechanic A -> Attempt changing mechanic_id to Mechanic B -> 400 & DB Unchanged
    const r11a = await makeRequest(app, 'PUT', `/api/appointments/${appointmentA.id}`, mechanicAToken, { mechanic_id: mechanicB.id });
    if (r11a.statusCode !== 400) throw new Error(`TEST 11a Failed: Mechanic reassigning appointment returned ${r11a.statusCode}`);
    let fresh11a = await Appointment.findOne({ where: { id: appointmentA.id }, raw: true });
    if (fresh11a.mechanic_id !== mechanicA.id) throw new Error(`TEST 11a Failed: DB mechanic_id changed after blocked update attempt`);
    console.log('✔ TEST 11a PASSED: Mechanic attempting to change mechanic_id rejected with HTTP 400 and DB mechanic_id preserved');

    // TEST 11b: Mechanic A -> Attempt changing client_id to Client B -> 400 & DB Unchanged
    const r11b = await makeRequest(app, 'PUT', `/api/appointments/${appointmentA.id}`, mechanicAToken, { client_id: clientB.id });
    if (r11b.statusCode !== 400) throw new Error(`TEST 11b Failed: Mechanic changing client_id returned ${r11b.statusCode}`);
    let fresh11b = await Appointment.findOne({ where: { id: appointmentA.id }, raw: true });
    if (fresh11b.client_id !== clientA.id) throw new Error(`TEST 11b Failed: DB client_id changed after blocked update attempt`);
    console.log('✔ TEST 11b PASSED: Mechanic attempting to change client_id rejected with HTTP 400 and DB client_id preserved');

    // TEST 11c: Mechanic A -> Attempt changing vehicle_id to Vehicle B -> 400 & DB Unchanged
    const r11c = await makeRequest(app, 'PUT', `/api/appointments/${appointmentA.id}`, mechanicAToken, { vehicle_id: vehicleB.id });
    if (r11c.statusCode !== 400) throw new Error(`TEST 11c Failed: Mechanic changing vehicle_id returned ${r11c.statusCode}`);
    let fresh11c = await Appointment.findOne({ where: { id: appointmentA.id }, raw: true });
    if (fresh11c.vehicle_id !== vehicleA.id) throw new Error(`TEST 11c Failed: DB vehicle_id changed after blocked update attempt`);
    console.log('✔ TEST 11c PASSED: Mechanic attempting to change vehicle_id rejected with HTTP 400 and DB vehicle_id preserved');

    // TEST 11d: Mechanic A -> Attempt changing scheduled_date -> 400 & DB Unchanged
    const r11d = await makeRequest(app, 'PUT', `/api/appointments/${appointmentA.id}`, mechanicAToken, { scheduled_date: '2030-01-01T00:00:00Z' });
    if (r11d.statusCode !== 400) throw new Error(`TEST 11d Failed: Mechanic changing scheduled_date returned ${r11d.statusCode}`);
    let fresh11d = await Appointment.findOne({ where: { id: appointmentA.id }, raw: true });
    if (new Date(fresh11d.scheduled_date).getFullYear() === 2030) throw new Error(`TEST 11d Failed: DB scheduled_date changed after blocked update attempt`);
    console.log('✔ TEST 11d PASSED: Mechanic attempting to change scheduled_date rejected with HTTP 400 and DB date preserved');

    // TEST 11e: Mechanic A -> Attempt changing problem_description -> 400 & DB Unchanged
    const r11e = await makeRequest(app, 'PUT', `/api/appointments/${appointmentA.id}`, mechanicAToken, { problem_description: 'Hacked issue' });
    if (r11e.statusCode !== 400) throw new Error(`TEST 11e Failed: Mechanic changing problem_description returned ${r11e.statusCode}`);
    let fresh11e = await Appointment.findOne({ where: { id: appointmentA.id }, raw: true });
    if (fresh11e.problem_description !== 'Engine Noise Check') throw new Error(`TEST 11e Failed: DB problem_description changed after blocked update attempt`);
    console.log('✔ TEST 11e PASSED: Mechanic attempting to change problem_description rejected with HTTP 400 and DB issue preserved');

    // TEST 12: Admin -> PUT appointment -> 200
    const r12 = await makeRequest(app, 'PUT', `/api/appointments/${appointmentA.id}`, adminToken, { status: 'completed' });
    if (r12.statusCode !== 200) throw new Error(`TEST 12 Failed: Admin PUT appointment returned ${r12.statusCode}`);
    console.log('✔ TEST 12 PASSED: Admin updating appointment returned HTTP 200');

    // TEST 13: Receptionist -> PUT appointment -> 200
    const r13 = await makeRequest(app, 'PUT', `/api/appointments/${appointmentB.id}`, receptionistToken, { mechanic_id: mechanicA.id });
    if (r13.statusCode !== 200) throw new Error(`TEST 13 Failed: Receptionist PUT appointment returned ${r13.statusCode}`);
    console.log('✔ TEST 13 PASSED: Receptionist updating appointment / assigning mechanic returned HTTP 200');

    // SECTION 3: TECHNICAL REPORTS (POST /api/reports)
    // TEST 14: Client -> POST /reports -> 403 (RBAC)
    const r14 = await makeRequest(app, 'POST', '/api/reports', clientAToken, { appointment_id: appointmentA.id });
    if (r14.statusCode !== 403) throw new Error(`TEST 14 Failed: Client POST /reports returned ${r14.statusCode}`);
    console.log('✔ TEST 14 PASSED: Client POST /reports rejected with HTTP 403 Forbidden');

    // TEST 15: Receptionist -> POST /reports -> 403 (RBAC)
    const r15 = await makeRequest(app, 'POST', '/api/reports', receptionistToken, { appointment_id: appointmentA.id });
    if (r15.statusCode !== 403) throw new Error(`TEST 15 Failed: Receptionist POST /reports returned ${r15.statusCode}`);
    console.log('✔ TEST 15 PASSED: Receptionist POST /reports rejected with HTTP 403 Forbidden');

    // TEST 16: Mechanic A -> valid assigned appointment -> 201
    const r16 = await makeRequest(app, 'POST', '/api/reports', mechanicAToken, {
      appointment_id: appointmentA.id,
      diagnostics: 'Spark plug worn out',
      odometer: 45000,
      visual_notes: 'Clean exterior'
    });
    if (r16.statusCode !== 201 || !r16.body.report) throw new Error(`TEST 16 Failed: Mechanic A creating report returned ${r16.statusCode}`);
    console.log('✔ TEST 16 PASSED: Mechanic A creating technical report for assigned appointment returned HTTP 201');
    reportCreatedIds.push(r16.body.report.id);

    // TEST 17: Mechanic A -> unassigned appointment -> 404
    const r17 = await makeRequest(app, 'POST', '/api/reports', mechanicAToken, {
      appointment_id: appointmentUnassigned.id,
      diagnostics: 'Unassigned appointment'
    });
    if (r17.statusCode !== 404) throw new Error(`TEST 17 Failed: Mechanic A creating report for unassigned appointment returned ${r17.statusCode}`);
    console.log('✔ TEST 17 PASSED: Mechanic A creating report for unassigned appointment returned HTTP 404 Not Found');

    // TEST 18: Mechanic A -> invalid appointment_id (999999) -> 404
    const r18 = await makeRequest(app, 'POST', '/api/reports', mechanicAToken, {
      appointment_id: 999999,
      diagnostics: 'Invalid ID test'
    });
    if (r18.statusCode !== 404) throw new Error(`TEST 18 Failed: Mechanic A creating report with invalid appointment_id returned ${r18.statusCode}`);
    console.log('✔ TEST 18 PASSED: Mechanic A creating report for invalid appointment_id returned HTTP 404 Not Found');

    // TEST 19: Mechanic A -> missing appointment_id -> 400
    const r19 = await makeRequest(app, 'POST', '/api/reports', mechanicAToken, {
      diagnostics: 'Missing appointment_id'
    });
    if (r19.statusCode !== 400) throw new Error(`TEST 19 Failed: Missing appointment_id returned ${r19.statusCode}`);
    console.log('✔ TEST 19 PASSED: Missing appointment_id rejected with HTTP 400 Bad Request');

    // TEST 20: Admin -> valid appointment -> 201
    const r20 = await makeRequest(app, 'POST', '/api/reports', adminToken, {
      appointment_id: appointmentA.id,
      diagnostics: 'Admin diagnostic review'
    });
    if (r20.statusCode !== 201) throw new Error(`TEST 20 Failed: Admin creating report returned ${r20.statusCode}`);
    console.log('✔ TEST 20 PASSED: Admin creating technical report for valid appointment returned HTTP 201');
    reportCreatedIds.push(r20.body.report.id);

    // SECTION 4: AUTHENTICATION
    // TEST 21: Missing token -> 401
    const r21 = await makeRequest(app, 'GET', `/api/appointments/${appointmentA.id}`);
    if (r21.statusCode !== 401) throw new Error(`TEST 21 Failed: Missing token returned ${r21.statusCode}`);
    console.log('✔ TEST 21 PASSED: Missing token returned 401 Unauthorized');

    // TEST 22: Invalid token -> 401
    const r22 = await makeRequest(app, 'GET', `/api/appointments/${appointmentA.id}`, 'invalid_token_xyz');
    if (r22.statusCode !== 401) throw new Error(`TEST 22 Failed: Invalid token returned ${r22.statusCode}`);
    console.log('✔ TEST 22 PASSED: Invalid token returned 401 Unauthorized');

  } finally {
    console.log('\nCleaning up temporary test records...');
    await cleanupTestData();
  }

  console.log('\n=== ALL BATCH 5.2 TESTS (INCLUDING MECHANIC FIELD RESTRICTIONS & DB VERIFICATION) PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n✖ TEST FAILED:', err);
  process.exit(1);
});
