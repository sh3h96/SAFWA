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
const { sequelize, User, SparePart } = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/models');
const userRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/userRoutes');
const dashboardRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/dashboardRoutes');
const sparePartRoutes = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/routes/sparePartRoutes');

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', sparePartRoutes);

const secret = process.env.JWT_SECRET || 'safwa_secret_key';

const clientToken = jwt.sign({ id: 101, role: 'client', email: 'client_test@safwa.sa' }, secret);
const mechanicToken = jwt.sign({ id: 102, role: 'mechanic', email: 'mechanic_test@safwa.sa' }, secret);
const receptionistToken = jwt.sign({ id: 103, role: 'receptionist', email: 'receptionist_test@safwa.sa' }, secret);
const adminToken = jwt.sign({ id: 104, role: 'admin', email: 'admin_test@safwa.sa' }, secret);

let createdUserId = null;
let createdPartId = null;

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

async function runTests() {
  console.log('=== BATCH 4.2 RBAC INTEGRATION TESTS ===\n');

  try {
    await sequelize.authenticate();
    console.log('✔ DB Connection: SUCCESS');

    // USER ROUTES TESTS
    // 1. No token -> 401
    const r1 = await makeRequest(app, 'GET', '/api/users');
    if (r1.statusCode !== 401) throw new Error(`TEST 1 Failed: Expected 401, got ${r1.statusCode}`);
    console.log('✔ TEST 1 PASSED: GET /api/users with No Token returned 401');

    // 2. Client: GET /api/users -> 403
    const r2 = await makeRequest(app, 'GET', '/api/users', clientToken);
    if (r2.statusCode !== 403) throw new Error(`TEST 2 Failed: Expected 403, got ${r2.statusCode}`);
    console.log('✔ TEST 2 PASSED: Client calling GET /api/users returned 403 Forbidden');

    // 3. Mechanic: GET /api/users -> 403
    const r3 = await makeRequest(app, 'GET', '/api/users', mechanicToken);
    if (r3.statusCode !== 403) throw new Error(`TEST 3 Failed: Expected 403, got ${r3.statusCode}`);
    console.log('✔ TEST 3 PASSED: Mechanic calling GET /api/users returned 403 Forbidden');

    // 4. Receptionist: GET /api/users -> 200
    const r4 = await makeRequest(app, 'GET', '/api/users', receptionistToken);
    if (r4.statusCode !== 200) throw new Error(`TEST 4 Failed: Expected 200, got ${r4.statusCode}`);
    console.log('✔ TEST 4 PASSED: Receptionist calling GET /api/users returned 200 OK');

    // 5. Admin: GET /api/users -> 200
    const r5 = await makeRequest(app, 'GET', '/api/users', adminToken);
    if (r5.statusCode !== 200) throw new Error(`TEST 5 Failed: Expected 200, got ${r5.statusCode}`);
    console.log('✔ TEST 5 PASSED: Admin calling GET /api/users returned 200 OK');

    // 6. Client: POST /api/users -> 403
    const r6 = await makeRequest(app, 'POST', '/api/users', clientToken, { name: 'X', email: 'x@x.com' });
    if (r6.statusCode !== 403) throw new Error(`TEST 6 Failed: Expected 403, got ${r6.statusCode}`);
    console.log('✔ TEST 6 PASSED: Client calling POST /api/users returned 403 Forbidden');

    // 7. Mechanic: POST /api/users -> 403
    const r7 = await makeRequest(app, 'POST', '/api/users', mechanicToken, { name: 'X', email: 'x@x.com' });
    if (r7.statusCode !== 403) throw new Error(`TEST 7 Failed: Expected 403, got ${r7.statusCode}`);
    console.log('✔ TEST 7 PASSED: Mechanic calling POST /api/users returned 403 Forbidden');

    // 8. Receptionist: POST /api/users -> 403
    const r8 = await makeRequest(app, 'POST', '/api/users', receptionistToken, { name: 'X', email: 'x@x.com' });
    if (r8.statusCode !== 403) throw new Error(`TEST 8 Failed: Expected 403, got ${r8.statusCode}`);
    console.log('✔ TEST 8 PASSED: Receptionist calling POST /api/users returned 403 Forbidden');

    // 9. Admin: POST /api/users -> allowed (201)
    const r9 = await makeRequest(app, 'POST', '/api/users', adminToken, {
      name: 'Test RBAC User',
      email: `rbac_test_${Date.now()}@safwa.sa`,
      password: 'password123',
      role: 'client'
    });
    if (r9.statusCode !== 201 || !r9.body?.id) throw new Error(`TEST 9 Failed: Expected 201, got ${r9.statusCode}`);
    createdUserId = r9.body.id;
    console.log(`✔ TEST 9 PASSED: Admin created user ID ${createdUserId} successfully`);

    // 10. Client: PUT /api/users/:id/status -> 403
    const r10 = await makeRequest(app, 'PUT', `/api/users/${createdUserId}/status`, clientToken, { status: 'suspended' });
    if (r10.statusCode !== 403) throw new Error(`TEST 10 Failed: Expected 403, got ${r10.statusCode}`);
    console.log('✔ TEST 10 PASSED: Client calling PUT /api/users/:id/status returned 403 Forbidden');

    // 11. Mechanic: PUT /api/users/:id/status -> 403
    const r11 = await makeRequest(app, 'PUT', `/api/users/${createdUserId}/status`, mechanicToken, { status: 'suspended' });
    if (r11.statusCode !== 403) throw new Error(`TEST 11 Failed: Expected 403, got ${r11.statusCode}`);
    console.log('✔ TEST 11 PASSED: Mechanic calling PUT /api/users/:id/status returned 403 Forbidden');

    // 12. Admin: PUT /api/users/:id/status -> allowed (200)
    const r12 = await makeRequest(app, 'PUT', `/api/users/${createdUserId}/status`, adminToken, { status: 'suspended' });
    if (r12.statusCode !== 200) throw new Error(`TEST 12 Failed: Expected 200, got ${r12.statusCode}`);
    console.log('✔ TEST 12 PASSED: Admin calling PUT /api/users/:id/status allowed and updated status');

    // DASHBOARD TESTS
    // 13. Client: GET /api/dashboard/metrics -> 403
    const r13 = await makeRequest(app, 'GET', '/api/dashboard/metrics', clientToken);
    if (r13.statusCode !== 403) throw new Error(`TEST 13 Failed: Expected 403, got ${r13.statusCode}`);
    console.log('✔ TEST 13 PASSED: Client calling GET /api/dashboard/metrics returned 403 Forbidden');

    // 14. Mechanic: GET /api/dashboard/metrics -> 403
    const r14 = await makeRequest(app, 'GET', '/api/dashboard/metrics', mechanicToken);
    if (r14.statusCode !== 403) throw new Error(`TEST 14 Failed: Expected 403, got ${r14.statusCode}`);
    console.log('✔ TEST 14 PASSED: Mechanic calling GET /api/dashboard/metrics returned 403 Forbidden');

    // 15. Receptionist: GET /api/dashboard/metrics -> 200
    const r15 = await makeRequest(app, 'GET', '/api/dashboard/metrics', receptionistToken);
    if (r15.statusCode !== 200) throw new Error(`TEST 15 Failed: Expected 200, got ${r15.statusCode}`);
    console.log('✔ TEST 15 PASSED: Receptionist calling GET /api/dashboard/metrics returned 200 OK');

    // 16. Admin: GET /api/dashboard/metrics -> 200
    const r16 = await makeRequest(app, 'GET', '/api/dashboard/metrics', adminToken);
    if (r16.statusCode !== 200) throw new Error(`TEST 16 Failed: Expected 200, got ${r16.statusCode}`);
    console.log('✔ TEST 16 PASSED: Admin calling GET /api/dashboard/metrics returned 200 OK');

    // 17. Client: GET /api/dashboard/charts -> 403
    const r17 = await makeRequest(app, 'GET', '/api/dashboard/charts', clientToken);
    if (r17.statusCode !== 403) throw new Error(`TEST 17 Failed: Expected 403, got ${r17.statusCode}`);
    console.log('✔ TEST 17 PASSED: Client calling GET /api/dashboard/charts returned 403 Forbidden');

    // 18. Receptionist: GET /api/dashboard/charts -> 200
    const r18 = await makeRequest(app, 'GET', '/api/dashboard/charts', receptionistToken);
    if (r18.statusCode !== 200) throw new Error(`TEST 18 Failed: Expected 200, got ${r18.statusCode}`);
    console.log('✔ TEST 18 PASSED: Receptionist calling GET /api/dashboard/charts returned 200 OK');

    // 19. Client: GET /api/dashboard/work-orders -> 403
    const r19 = await makeRequest(app, 'GET', '/api/dashboard/work-orders', clientToken);
    if (r19.statusCode !== 403) throw new Error(`TEST 19 Failed: Expected 403, got ${r19.statusCode}`);
    console.log('✔ TEST 19 PASSED: Client calling GET /api/dashboard/work-orders returned 403 Forbidden');

    // 20. Receptionist: GET /api/dashboard/work-orders -> 200
    const r20 = await makeRequest(app, 'GET', '/api/dashboard/work-orders', receptionistToken);
    if (r20.statusCode !== 200) throw new Error(`TEST 20 Failed: Expected 200, got ${r20.statusCode}`);
    console.log('✔ TEST 20 PASSED: Receptionist calling GET /api/dashboard/work-orders returned 200 OK');

    // INVENTORY TESTS
    // 21. Client: GET /api/inventory -> 403
    const r21 = await makeRequest(app, 'GET', '/api/inventory', clientToken);
    if (r21.statusCode !== 403) throw new Error(`TEST 21 Failed: Expected 403, got ${r21.statusCode}`);
    console.log('✔ TEST 21 PASSED: Client calling GET /api/inventory returned 403 Forbidden');

    // 22. Mechanic: GET /api/inventory -> 200
    const r22 = await makeRequest(app, 'GET', '/api/inventory', mechanicToken);
    if (r22.statusCode !== 200) throw new Error(`TEST 22 Failed: Expected 200, got ${r22.statusCode}`);
    console.log('✔ TEST 22 PASSED: Mechanic calling GET /api/inventory returned 200 OK');

    // 23. Receptionist: GET /api/inventory -> 200
    const r23 = await makeRequest(app, 'GET', '/api/inventory', receptionistToken);
    if (r23.statusCode !== 200) throw new Error(`TEST 23 Failed: Expected 200, got ${r23.statusCode}`);
    console.log('✔ TEST 23 PASSED: Receptionist calling GET /api/inventory returned 200 OK');

    // 24. Admin: GET /api/inventory -> 200
    const r24 = await makeRequest(app, 'GET', '/api/inventory', adminToken);
    if (r24.statusCode !== 200) throw new Error(`TEST 24 Failed: Expected 200, got ${r24.statusCode}`);
    console.log('✔ TEST 24 PASSED: Admin calling GET /api/inventory returned 200 OK');

    // 25. Client: POST /api/inventory -> 403
    const r25 = await makeRequest(app, 'POST', '/api/inventory', clientToken, { name: 'P', price: 100 });
    if (r25.statusCode !== 403) throw new Error(`TEST 25 Failed: Expected 403, got ${r25.statusCode}`);
    console.log('✔ TEST 25 PASSED: Client calling POST /api/inventory returned 403 Forbidden');

    // 26. Mechanic: POST /api/inventory -> 403
    const r26 = await makeRequest(app, 'POST', '/api/inventory', mechanicToken, { name: 'P', price: 100 });
    if (r26.statusCode !== 403) throw new Error(`TEST 26 Failed: Expected 403, got ${r26.statusCode}`);
    console.log('✔ TEST 26 PASSED: Mechanic calling POST /api/inventory returned 403 Forbidden');

    // 27. Receptionist: POST /api/inventory -> 403
    const r27 = await makeRequest(app, 'POST', '/api/inventory', receptionistToken, { name: 'P', price: 100 });
    if (r27.statusCode !== 403) throw new Error(`TEST 27 Failed: Expected 403, got ${r27.statusCode}`);
    console.log('✔ TEST 27 PASSED: Receptionist calling POST /api/inventory returned 403 Forbidden');

    // 28. Admin: POST /api/inventory -> allowed (201)
    const r28 = await makeRequest(app, 'POST', '/api/inventory', adminToken, {
      name: 'فلتر زيت اصلي تجريبي',
      part_number: `FLT-${Date.now()}`,
      brand: 'Toyota',
      price: 45,
      stock_quantity: 15,
      min_stock_level: 5
    });
    if (r28.statusCode !== 201 || !r28.body?.part?.id) throw new Error(`TEST 28 Failed: Expected 201, got ${r28.statusCode}`);
    createdPartId = r28.body.part.id;
    console.log(`✔ TEST 28 PASSED: Admin created spare part ID ${createdPartId} successfully`);

    // 29. Client: PUT /api/inventory/:id -> 403
    const r29 = await makeRequest(app, 'PUT', `/api/inventory/${createdPartId}`, clientToken, { stock_quantity: 50 });
    if (r29.statusCode !== 403) throw new Error(`TEST 29 Failed: Expected 403, got ${r29.statusCode}`);
    console.log('✔ TEST 29 PASSED: Client calling PUT /api/inventory/:id returned 403 Forbidden');

    // 30. Mechanic: PUT /api/inventory/:id -> 403
    const r30 = await makeRequest(app, 'PUT', `/api/inventory/${createdPartId}`, mechanicToken, { stock_quantity: 50 });
    if (r30.statusCode !== 403) throw new Error(`TEST 30 Failed: Expected 403, got ${r30.statusCode}`);
    console.log('✔ TEST 30 PASSED: Mechanic calling PUT /api/inventory/:id returned 403 Forbidden');

    // 31. Receptionist: PUT /api/inventory/:id -> 403
    const r31 = await makeRequest(app, 'PUT', `/api/inventory/${createdPartId}`, receptionistToken, { stock_quantity: 50 });
    if (r31.statusCode !== 403) throw new Error(`TEST 31 Failed: Expected 403, got ${r31.statusCode}`);
    console.log('✔ TEST 31 PASSED: Receptionist calling PUT /api/inventory/:id returned 403 Forbidden');

    // 32. Admin: PUT /api/inventory/:id -> allowed (200)
    const r32 = await makeRequest(app, 'PUT', `/api/inventory/${createdPartId}`, adminToken, { stock_quantity: 50 });
    if (r32.statusCode !== 200) throw new Error(`TEST 32 Failed: Expected 200, got ${r32.statusCode}`);
    console.log('✔ TEST 32 PASSED: Admin calling PUT /api/inventory/:id allowed and updated stock quantity');

  } finally {
    console.log('\nCleaning up temporary test records...');
    if (createdUserId) await User.destroy({ where: { id: createdUserId } });
    if (createdPartId) await SparePart.destroy({ where: { id: createdPartId } });
    console.log('✔ Database clean: Temporary test user & spare part deleted successfully.');
  }

  console.log('\n=== ALL 32 BATCH 4.2 TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n✖ TEST FAILED:', err);
  process.exit(1);
});
