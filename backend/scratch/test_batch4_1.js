let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  jwt = {
    sign: (payload, secret, options) => {
      if (options && options.expiresIn && options.expiresIn < 0) {
        return 'mock_token_expired_' + JSON.stringify(payload);
      }
      return 'mock_token_' + JSON.stringify(payload);
    },
    verify: (token) => {
      if (typeof token === 'string' && token.includes('expired')) {
        throw new Error('jwt expired');
      }
      if (typeof token === 'string' && token.startsWith('mock_token_')) {
        return JSON.parse(token.replace('mock_token_', ''));
      }
      throw new Error('Invalid token');
    }
  };
}

const auth = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/middleware/auth');
const { authenticateToken, requireRole } = auth;

function createMockReq(headers = {}, query = {}, user = null) {
  return {
    headers,
    query,
    user,
    header(name) {
      const lower = name.toLowerCase();
      for (const k of Object.keys(headers)) {
        if (k.toLowerCase() === lower) return headers[k];
      }
      return null;
    }
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    responseData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.responseData = data;
      return this;
    }
  };
}

function runTests() {
  console.log('=== BATCH 4.1 AUTHENTICATION & RBAC MIDDLEWARE TESTS ===\n');

  const secret = process.env.JWT_SECRET || 'safwa_secret_key';

  const clientToken = jwt.sign({ id: 1, role: 'client', email: 'client@safwa.sa' }, secret);
  const mechanicToken = jwt.sign({ id: 2, role: 'mechanic', email: 'mechanic@safwa.sa' }, secret);
  const adminToken = jwt.sign({ id: 3, role: 'admin', email: 'admin@safwa.sa' }, secret);
  const expiredToken = jwt.sign({ id: 4, role: 'client' }, secret, { expiresIn: -10 });

  // TEST 1: No Authorization header -> 401
  const req1 = createMockReq();
  const res1 = createMockRes();
  let nextCalled1 = false;
  authenticateToken(req1, res1, () => { nextCalled1 = true; });
  if (res1.statusCode !== 401 || nextCalled1) {
    throw new Error(`TEST 1 Failed: Expected 401, got ${res1.statusCode}`);
  }
  console.log('✔ TEST 1 PASSED: Missing Authorization header returned 401');

  // TEST 2: Authorization: Token xxx -> 401
  const req2 = createMockReq({ authorization: `Token ${clientToken}` });
  const res2 = createMockRes();
  let nextCalled2 = false;
  authenticateToken(req2, res2, () => { nextCalled2 = true; });
  if (res2.statusCode !== 401 || nextCalled2) {
    throw new Error(`TEST 2 Failed: Expected 401 for Token scheme, got ${res2.statusCode}`);
  }
  console.log('✔ TEST 2 PASSED: Authorization: Token xxx scheme rejected with 401');

  // TEST 3: Query token -> 401
  const req3 = createMockReq({}, { token: clientToken });
  const res3 = createMockRes();
  let nextCalled3 = false;
  authenticateToken(req3, res3, () => { nextCalled3 = true; });
  if (res3.statusCode !== 401 || nextCalled3) {
    throw new Error(`TEST 3 Failed: Expected 401 for query token, got ${res3.statusCode}`);
  }
  console.log('✔ TEST 3 PASSED: Query token req.query.token rejected with 401');

  // TEST 4: Malformed Bearer -> 401
  const req4 = createMockReq({ authorization: 'Bearer' });
  const res4 = createMockRes();
  let nextCalled4 = false;
  authenticateToken(req4, res4, () => { nextCalled4 = true; });
  if (res4.statusCode !== 401 || nextCalled4) {
    throw new Error(`TEST 4 Failed: Expected 401 for malformed Bearer header, got ${res4.statusCode}`);
  }
  console.log('✔ TEST 4 PASSED: Malformed Bearer header rejected with 401');

  // TEST 5: Invalid JWT -> 401
  const req5 = createMockReq({ authorization: 'Bearer invalid_jwt_string_12345' });
  const res5 = createMockRes();
  let nextCalled5 = false;
  authenticateToken(req5, res5, () => { nextCalled5 = true; });
  if (res5.statusCode !== 401 || nextCalled5) {
    throw new Error(`TEST 5 Failed: Expected 401 for invalid JWT, got ${res5.statusCode}`);
  }
  console.log('✔ TEST 5 PASSED: Invalid JWT string rejected with 401');

  // TEST 6: Expired JWT -> 401
  const req6 = createMockReq({ authorization: `Bearer ${expiredToken}` });
  const res6 = createMockRes();
  let nextCalled6 = false;
  authenticateToken(req6, res6, () => { nextCalled6 = true; });
  if (res6.statusCode !== 401 || nextCalled6) {
    throw new Error(`TEST 6 Failed: Expected 401 for expired JWT, got ${res6.statusCode}`);
  }
  console.log('✔ TEST 6 PASSED: Expired JWT rejected with 401');

  // TEST 7: Valid client JWT -> authenticate successfully
  const req7 = createMockReq({ authorization: `Bearer ${clientToken}` });
  const res7 = createMockRes();
  let nextCalled7 = false;
  authenticateToken(req7, res7, () => { nextCalled7 = true; });
  if (!nextCalled7 || !req7.user || req7.user.role !== 'client') {
    throw new Error('TEST 7 Failed: Valid client JWT failed authentication');
  }
  console.log('✔ TEST 7 PASSED: Valid client Bearer JWT authenticated successfully');

  // TEST 8: Valid mechanic JWT -> authenticate successfully
  const req8 = createMockReq({ authorization: `Bearer ${mechanicToken}` });
  const res8 = createMockRes();
  let nextCalled8 = false;
  authenticateToken(req8, res8, () => { nextCalled8 = true; });
  if (!nextCalled8 || !req8.user || req8.user.role !== 'mechanic') {
    throw new Error('TEST 8 Failed: Valid mechanic JWT failed authentication');
  }
  console.log('✔ TEST 8 PASSED: Valid mechanic Bearer JWT authenticated successfully');

  // TEST 9: Valid admin JWT -> authenticate successfully
  const req9 = createMockReq({ authorization: `Bearer ${adminToken}` });
  const res9 = createMockRes();
  let nextCalled9 = false;
  authenticateToken(req9, res9, () => { nextCalled9 = true; });
  if (!nextCalled9 || !req9.user || req9.user.role !== 'admin') {
    throw new Error('TEST 9 Failed: Valid admin JWT failed authentication');
  }
  console.log('✔ TEST 9 PASSED: Valid admin Bearer JWT authenticated successfully');

  // TEST 10: requireRole('client') + client -> next()
  const req10 = createMockReq({}, {}, { id: 1, role: 'client' });
  const res10 = createMockRes();
  let nextCalled10 = false;
  requireRole('client')(req10, res10, () => { nextCalled10 = true; });
  if (!nextCalled10) {
    throw new Error('TEST 10 Failed: requireRole(client) rejected valid client user');
  }
  console.log('✔ TEST 10 PASSED: requireRole("client") allowed client user');

  // TEST 11: requireRole('admin') + client -> 403
  const req11 = createMockReq({}, {}, { id: 1, role: 'client' });
  const res11 = createMockRes();
  let nextCalled11 = false;
  requireRole('admin')(req11, res11, () => { nextCalled11 = true; });
  if (res11.statusCode !== 403 || nextCalled11) {
    throw new Error(`TEST 11 Failed: Expected 403 for client accessing admin route, got ${res11.statusCode}`);
  }
  console.log('✔ TEST 11 PASSED: requireRole("admin") rejected client user with 403 Forbidden');

  // TEST 12: requireRole('mechanic', 'admin') + mechanic -> next()
  const req12 = createMockReq({}, {}, { id: 2, role: 'mechanic' });
  const res12 = createMockRes();
  let nextCalled12 = false;
  requireRole('mechanic', 'admin')(req12, res12, () => { nextCalled12 = true; });
  if (!nextCalled12) {
    throw new Error('TEST 12 Failed: requireRole(mechanic, admin) rejected mechanic user');
  }
  console.log('✔ TEST 12 PASSED: requireRole("mechanic", "admin") allowed mechanic user');

  // TEST 13: requireRole('receptionist') + mechanic -> 403
  const req13 = createMockReq({}, {}, { id: 2, role: 'mechanic' });
  const res13 = createMockRes();
  let nextCalled13 = false;
  requireRole('receptionist')(req13, res13, () => { nextCalled13 = true; });
  if (res13.statusCode !== 403 || nextCalled13) {
    throw new Error(`TEST 13 Failed: Expected 403 for mechanic accessing receptionist route, got ${res13.statusCode}`);
  }
  console.log('✔ TEST 13 PASSED: requireRole("receptionist") rejected mechanic user with 403 Forbidden');

  console.log('\n=== ALL BATCH 4.1 TESTS PASSED SUCCESSFULLY! ===');
}

runTests();
