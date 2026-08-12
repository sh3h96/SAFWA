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
  InvoiceItem,
  Payment
} = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/models');

const invoiceRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/invoiceRoutes');
const vehicleRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/vehicleRoutes');

const app = express();
app.use(express.json());
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vehicles', vehicleRoutes);

const secret = process.env.JWT_SECRET || 'safwa_secret_key';

let clientA, clientB, adminUser, receptionistUser, mechanicUser;
let vehicleA, vehicleB;
let appointmentA, appointmentB;
let invoiceA, invoiceB, invoiceC, invoiceItemC;
let clientAToken, clientBToken, adminToken, receptionistToken, mechanicToken;
let createdVehicleIds = [];

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
    name: 'Batch 5.1 Client A',
    email: `clienta_b51_${ts}@safwa.sa`,
    password: 'hash',
    role: 'client',
    status: 'active'
  });

  clientB = await User.create({
    name: 'Batch 5.1 Client B',
    email: `clientb_b51_${ts}@safwa.sa`,
    password: 'hash',
    role: 'client',
    status: 'active'
  });

  adminUser = await User.create({
    name: 'Batch 5.1 Admin',
    email: `admin_b51_${ts}@safwa.sa`,
    password: 'hash',
    role: 'admin',
    status: 'active'
  });

  receptionistUser = await User.create({
    name: 'Batch 5.1 Receptionist',
    email: `receptionist_b51_${ts}@safwa.sa`,
    password: 'hash',
    role: 'receptionist',
    status: 'active'
  });

  mechanicUser = await User.create({
    name: 'Batch 5.1 Mechanic',
    email: `mechanic_b51_${ts}@safwa.sa`,
    password: 'hash',
    role: 'mechanic',
    status: 'active'
  });

  vehicleA = await Vehicle.create({
    client_id: clientA.id,
    make: 'Toyota',
    model: 'Camry',
    license_plate: `B51A-${ts % 10000}`,
    year: 2022
  });

  vehicleB = await Vehicle.create({
    client_id: clientB.id,
    make: 'Honda',
    model: 'Accord',
    license_plate: `B51B-${ts % 10000}`,
    year: 2023
  });

  appointmentA = await Appointment.create({
    client_id: clientA.id,
    vehicle_id: vehicleA.id,
    mechanic_id: mechanicUser.id,
    appointment_date: new Date(),
    status: 'completed',
    problem_description: 'Annual Maintenance'
  });

  appointmentB = await Appointment.create({
    client_id: clientB.id,
    vehicle_id: vehicleB.id,
    mechanic_id: mechanicUser.id,
    appointment_date: new Date(),
    status: 'completed',
    problem_description: 'Brake Replacement'
  });

  invoiceA = await Invoice.create({
    appointment_id: appointmentA.id,
    total_amount: 500,
    paid_amount: 0,
    status: 'unpaid'
  });

  invoiceB = await Invoice.create({
    appointment_id: appointmentB.id,
    total_amount: 800,
    paid_amount: 0,
    status: 'unpaid'
  });

  // Invoice C for F-5.9 dynamic cost calculation test
  invoiceC = await Invoice.create({
    appointment_id: appointmentA.id,
    total_amount: 750,
    paid_amount: 0,
    status: 'unpaid'
  });

  invoiceItemC = await InvoiceItem.create({
    invoice_id: invoiceC.id,
    description: 'Brake Pads Replacement',
    quantity: 2,
    unit_price: 150.00,
    total_price: 300.00
  });

  clientAToken = jwt.sign({ id: clientA.id, role: 'client', email: clientA.email }, secret);
  clientBToken = jwt.sign({ id: clientB.id, role: 'client', email: clientB.email }, secret);
  adminToken = jwt.sign({ id: adminUser.id, role: 'admin', email: adminUser.email }, secret);
  receptionistToken = jwt.sign({ id: receptionistUser.id, role: 'receptionist', email: receptionistUser.email }, secret);
  mechanicToken = jwt.sign({ id: mechanicUser.id, role: 'mechanic', email: mechanicUser.email }, secret);
}

async function cleanupTestData() {
  try {
    const userIds = [clientA?.id, clientB?.id, adminUser?.id, receptionistUser?.id, mechanicUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      for (const vId of createdVehicleIds) {
        await Vehicle.destroy({ where: { id: vId } });
      }
      const vList = await Vehicle.findAll({ where: { client_id: userIds } });
      const vIds = vList.map(v => v.id);

      if (vIds.length > 0) {
        const appts = await Appointment.findAll({ where: { vehicle_id: vIds } });
        const apptIds = appts.map(a => a.id);

        if (apptIds.length > 0) {
          const invs = await Invoice.findAll({ where: { appointment_id: apptIds } });
          const invIds = invs.map(i => i.id);

          if (invIds.length > 0) {
            await InvoiceItem.destroy({ where: { invoice_id: invIds } });
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
  console.log('=== BATCH 5.1 OWNERSHIP SECURITY & DYNAMIC COSTS INTEGRATION TESTS ===\n');

  try {
    await sequelize.authenticate();
    console.log('✔ DB Connection: SUCCESS');

    await setupTestData();
    console.log('✔ Test Data Setup: SUCCESS\n');

    // TEST 1: Client A -> Invoice B -> 404
    const r1 = await makeRequest(app, 'GET', `/api/invoices/${invoiceB.id}`, clientAToken);
    if (r1.statusCode !== 404) throw new Error(`TEST 1 Failed: Client A accessing Invoice B returned ${r1.statusCode}`);
    console.log('✔ TEST 1 PASSED: Client A requesting Client B invoice returned HTTP 404 Not Found');

    // TEST 2: Client A -> Own Invoice -> 200
    const r2 = await makeRequest(app, 'GET', `/api/invoices/${invoiceA.id}`, clientAToken);
    if (r2.statusCode !== 200 || r2.body.invoiceId !== invoiceA.id) throw new Error(`TEST 2 Failed: Client A accessing own invoice returned ${r2.statusCode}`);
    console.log('✔ TEST 2 PASSED: Client A requesting own invoice returned HTTP 200 with data');

    // TEST 3: Client A -> Pay Invoice B -> 404
    const r3 = await makeRequest(app, 'POST', `/api/invoices/${invoiceB.id}/pay`, clientAToken, { amount: 100 });
    if (r3.statusCode !== 404) throw new Error(`TEST 3 Failed: Client A paying Invoice B returned ${r3.statusCode}`);
    console.log('✔ TEST 3 PASSED: Client A attempting to pay Client B invoice returned HTTP 404 Not Found');

    // TEST 4: Client A -> Pay Own Invoice -> Success (200)
    const r4 = await makeRequest(app, 'POST', `/api/invoices/${invoiceA.id}/pay`, clientAToken, { amount: 200 });
    if (r4.statusCode !== 200 || r4.body.invoiceStatus !== 'partially_paid') throw new Error(`TEST 4 Failed: Client A paying own invoice returned ${r4.statusCode}`);
    console.log('✔ TEST 4 PASSED: Client A paying own invoice succeeded with HTTP 200');

    // TEST 5: Admin -> Update Client Vehicle -> Success (200)
    const r5 = await makeRequest(app, 'PUT', `/api/vehicles/${vehicleA.id}`, adminToken, { model: 'Camry Hybrid' });
    if (r5.statusCode !== 200 || r5.body.model !== 'Camry Hybrid') throw new Error(`TEST 5 Failed: Admin updating vehicle returned ${r5.statusCode}`);
    console.log('✔ TEST 5 PASSED: Admin updating client vehicle succeeded with HTTP 200');

    // TEST 6: Receptionist -> Update Client Vehicle -> Success (200)
    const r6 = await makeRequest(app, 'PUT', `/api/vehicles/${vehicleA.id}`, receptionistToken, { model: 'Camry SE' });
    if (r6.statusCode !== 200 || r6.body.model !== 'Camry SE') throw new Error(`TEST 6 Failed: Receptionist updating vehicle returned ${r6.statusCode}`);
    console.log('✔ TEST 6 PASSED: Receptionist updating client vehicle succeeded with HTTP 200');

    // TEST 7: Client -> Update Own Vehicle -> Success (200)
    const r7 = await makeRequest(app, 'PUT', `/api/vehicles/${vehicleA.id}`, clientAToken, { year: 2023 });
    if (r7.statusCode !== 200 || r7.body.year !== 2023) throw new Error(`TEST 7 Failed: Client updating own vehicle returned ${r7.statusCode}`);
    console.log('✔ TEST 7 PASSED: Client A updating own vehicle succeeded with HTTP 200');

    // TEST 8: Client A -> Vehicle B History -> 404
    const r8 = await makeRequest(app, 'GET', `/api/vehicles/${vehicleB.id}/history`, clientAToken);
    if (r8.statusCode !== 404) throw new Error(`TEST 8 Failed: Client A requesting Vehicle B history returned ${r8.statusCode}`);
    console.log('✔ TEST 8 PASSED: Client A requesting Client B vehicle history returned HTTP 404 Not Found');

    // TEST 9: Client A -> Own Vehicle History -> Success (200)
    const r9 = await makeRequest(app, 'GET', `/api/vehicles/${vehicleA.id}/history`, clientAToken);
    if (r9.statusCode !== 200 || !Array.isArray(r9.body)) throw new Error(`TEST 9 Failed: Client A requesting own vehicle history returned ${r9.statusCode}`);
    console.log('✔ TEST 9 PASSED: Client A requesting own vehicle history returned HTTP 200');

    // TEST 10: Admin -> Create Vehicle for Client B -> Success (201, client_id = Client B)
    const r10 = await makeRequest(app, 'POST', '/api/vehicles', adminToken, {
      make: 'Nissan',
      model: 'Patrol',
      year: 2024,
      license_plate: `B51ADM-${Date.now() % 10000}`,
      client_id: clientB.id
    });
    if (r10.statusCode !== 201 || r10.body.client_id !== clientB.id) throw new Error(`TEST 10 Failed: Admin creating vehicle returned ${r10.statusCode}`);
    console.log('✔ TEST 10 PASSED: Admin creating vehicle for Client B assigned correct client_id');
    createdVehicleIds.push(r10.body.id);

    // TEST 11: Receptionist -> Create Vehicle for Client B -> Success (201, client_id = Client B)
    const r11 = await makeRequest(app, 'POST', '/api/vehicles', receptionistToken, {
      make: 'Lexus',
      model: 'LX600',
      year: 2024,
      license_plate: `B51REC-${Date.now() % 10000}`,
      client_id: clientB.id
    });
    if (r11.statusCode !== 201 || r11.body.client_id !== clientB.id) throw new Error(`TEST 11 Failed: Receptionist creating vehicle returned ${r11.statusCode}`);
    console.log('✔ TEST 11 PASSED: Receptionist creating vehicle for Client B assigned correct client_id');
    createdVehicleIds.push(r11.body.id);

    // TEST 12: Client -> Create Vehicle -> Remains assigned to Client A only (client_id = Client A)
    const r12 = await makeRequest(app, 'POST', '/api/vehicles', clientAToken, {
      make: 'Ford',
      model: 'Mustang',
      year: 2022,
      license_plate: `B51CLI-${Date.now() % 10000}`,
      client_id: clientB.id // Spoofing attempt
    });
    if (r12.statusCode !== 201 || r12.body.client_id !== clientA.id) throw new Error(`TEST 12 Failed: Client creating vehicle returned ${r12.statusCode}`);
    console.log('✔ TEST 12 PASSED: Client creating vehicle forced client_id to caller ID (spoofing prevented)');
    createdVehicleIds.push(r12.body.id);

    // TEST 13: Mechanic -> Cannot bypass existing RBAC
    const r13 = await makeRequest(app, 'POST', '/api/invoices/issue', mechanicToken, { appointment_id: appointmentA.id, labor_cost: 100 });
    if (r13.statusCode !== 403) throw new Error(`TEST 13 Failed: Mechanic /invoices/issue returned ${r13.statusCode}`);
    console.log('✔ TEST 13 PASSED: Mechanic attempting /invoices/issue returned 403 Forbidden');

    // TEST 14: Missing Token -> 401
    const r14 = await makeRequest(app, 'GET', `/api/invoices/${invoiceA.id}`);
    if (r14.statusCode !== 401) throw new Error(`TEST 14 Failed: Missing token returned ${r14.statusCode}`);
    console.log('✔ TEST 14 PASSED: Missing token returned 401 Unauthorized');

    // TEST 15: Invalid Token -> 401
    const r15 = await makeRequest(app, 'GET', `/api/invoices/${invoiceA.id}`, 'invalid_token_123');
    if (r15.statusCode !== 401) throw new Error(`TEST 15 Failed: Invalid token returned ${r15.statusCode}`);
    console.log('✔ TEST 15 PASSED: Invalid token returned 401 Unauthorized');

    // TEST 16: DEDICATED F-5.9 VERIFICATION — Dynamic Labor & Parts Cost Calculation
    const r16 = await makeRequest(app, 'GET', `/api/invoices/${invoiceC.id}`, clientAToken);
    if (r16.statusCode !== 200) {
      throw new Error(`TEST 16 Failed: Dynamic cost check endpoint returned ${r16.statusCode}`);
    }

    const { partsCost, laborCost } = r16.body.costs;
    const expectedPartsCost = 300;
    const expectedLaborCost = 450; // Total 750 - Parts 300 = 450

    if (partsCost !== expectedPartsCost || laborCost !== expectedLaborCost) {
      throw new Error(`TEST 16 Failed: Dynamic cost mismatch! Expected partsCost=${expectedPartsCost}, laborCost=${expectedLaborCost}. Received partsCost=${partsCost}, laborCost=${laborCost}. (Hardcoded value detected!)`);
    }

    console.log(`✔ TEST 16 PASSED (F-5.9): Dynamic cost verified successfully! (partsCost=${partsCost}, laborCost=${laborCost}, Total=${r16.body.totalAmount})`);

  } finally {
    console.log('\nCleaning up temporary test records...');
    await cleanupTestData();
  }

  console.log('\n=== ALL BATCH 5.1 TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n✖ TEST FAILED:', err);
  process.exit(1);
});
