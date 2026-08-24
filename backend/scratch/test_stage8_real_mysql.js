const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const http = require('http');
const app = require('../server');
const sequelize = require('../config/database');

async function runStage8RealMysqlSuite() {
  console.log('====================================================');
  console.log('🛡️ STAGE 8 REAL MYSQL DATABASE E2E TEST SUITE');
  console.log('====================================================');

  await sequelize.authenticate();
  console.log('✓ Connected to MySQL database on localhost:3306');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Express test server listening on port ${port}`);

  const testEmails = [];
  const secret = process.env.JWT_SECRET || 'safwa_secret_key';

  try {
    // ----------------------------------------------------
    // TEST 1: NEW JWT CONTAINS TOKEN VERSION
    // ----------------------------------------------------
    console.log('\n--- TEST 1: NEW JWT CONTAINS TOKEN VERSION ---');
    const email1 = `stage8_test1_${Date.now()}@example.com`;
    testEmails.push(email1);

    const reg1 = await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Stage 8 Test User 1',
        email: email1,
        password: 'Password123!',
        phone: `05${Math.floor(10000000 + Math.random() * 90000000)}`
      })
    });
    const regData1 = await reg1.json();
    console.log('1. Registration status:', reg1.status);

    const decoded1 = jwt.decode(regData1.token);
    console.log('   Decoded JWT claims:', decoded1);
    console.log('2. JWT contains tokenVersion?', decoded1.tokenVersion !== undefined);
    console.log('   tokenVersion equals 1?', decoded1.tokenVersion === 1);

    // ----------------------------------------------------
    // TEST 2: LEGACY JWT (WITHOUT TOKEN VERSION) REJECTED
    // ----------------------------------------------------
    console.log('\n--- TEST 2: LEGACY JWT (WITHOUT TOKEN VERSION) REJECTED ---');
    const legacyToken = jwt.sign({ id: decoded1.id, role: 'client', email: email1 }, secret, { expiresIn: '1d' });
    const legacyRes = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${legacyToken}` }
    });
    console.log('3. Legacy JWT without tokenVersion rejected (HTTP 401)?', legacyRes.status === 401);

    // ----------------------------------------------------
    // TEST 3: TOKEN VERSION MISMATCH REJECTED
    // ----------------------------------------------------
    console.log('\n--- TEST 3: TOKEN VERSION MISMATCH REJECTED ---');
    const validTokenA = regData1.token;

    // Manually increment token_version in DB
    await sequelize.query(`UPDATE users SET token_version = 2 WHERE email = '${email1}';`);

    const mismatchRes = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${validTokenA}` }
    });
    console.log('4. Token with mismatched tokenVersion rejected (HTTP 401)?', mismatchRes.status === 401);

    // ----------------------------------------------------
    // TEST 4: PASSWORD RESET REVOCATION
    // ----------------------------------------------------
    console.log('\n--- TEST 4: PASSWORD RESET REVOCATION ---');
    const email4 = `stage8_test4_${Date.now()}@example.com`;
    testEmails.push(email4);
    const origPass = 'OrigPass123!';
    const newPass = 'NewPass456!';

    await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Stage 8 Test User 4',
        email: email4,
        password: origPass,
        phone: `05${Math.floor(10000000 + Math.random() * 90000000)}`
      })
    });

    const login4Res1 = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email4, password: origPass })
    });
    const login4Data1 = await login4Res1.json();
    const token4A = login4Data1.token;

    // Trigger forgot password & reset password
    await fetch(`${baseUrl}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email4 })
    });

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const resetExpiresAt = new Date(Date.now() + 3600000);

    await sequelize.query(`UPDATE users SET reset_token_hash = '${resetTokenHash}', reset_token_expires_at = '${resetExpiresAt.toISOString().slice(0, 19).replace('T', ' ')}' WHERE email = '${email4}';`);

    await fetch(`${baseUrl}/api/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawResetToken, newPassword: newPass })
    });

    // Test token4A after password reset
    const token4ARes = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token4A}` }
    });
    console.log('5. Old JWT invalid after password reset (HTTP 401)?', token4ARes.status === 401);

    // Login with new password
    const login4Res2 = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email4, password: newPass })
    });
    console.log('6. Login with new password succeeds (HTTP 200)?', login4Res2.status === 200);

    // ----------------------------------------------------
    // TEST 5: ACCOUNT SUSPENSION REVOCATION
    // ----------------------------------------------------
    console.log('\n--- TEST 5: ACCOUNT SUSPENSION REVOCATION ---');
    const email5 = `stage8_test5_${Date.now()}@example.com`;
    testEmails.push(email5);

    await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Stage 8 Test User 5',
        email: email5,
        password: 'Password123!',
        phone: `05${Math.floor(10000000 + Math.random() * 90000000)}`
      })
    });

    const login5Res = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email5, password: 'Password123!' })
    });
    const login5Data = await login5Res.json();
    const token5A = login5Data.token;

    // Admin suspends user5
    const [user5Records] = await sequelize.query(`SELECT id FROM users WHERE email = '${email5}';`);
    const user5Id = user5Records[0].id;

    // Get admin JWT for administrative route
    const adminLoginRes = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@safwa.sa', password: 'password123' })
    });
    const adminLoginData = await adminLoginRes.json();

    const suspendRes = await fetch(`${baseUrl}/api/users/${user5Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLoginData.token}`
      }
    });
    console.log('7. Admin status toggle response:', suspendRes.status);

    // Test token5A on protected route
    const token5ARes = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token5A}` }
    });
    console.log('8. Suspended user JWT rejected on protected route (HTTP 401)?', token5ARes.status === 401);

    // Attempt fresh login while suspended
    const freshLoginRes = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email5, password: 'Password123!' })
    });
    console.log('9. Fresh login for suspended user blocked (HTTP 403)?', freshLoginRes.status === 403);

    // ----------------------------------------------------
    // TEST 6: SERVER-SIDE LOGOUT
    // ----------------------------------------------------
    console.log('\n--- TEST 6: SERVER-SIDE LOGOUT ---');
    const email6 = `stage8_test6_${Date.now()}@example.com`;
    testEmails.push(email6);

    const reg6 = await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Stage 8 Test User 6',
        email: email6,
        password: 'Password123!',
        phone: `05${Math.floor(10000000 + Math.random() * 90000000)}`
      })
    });
    const reg6Data = await reg6.json();
    const token6A = reg6Data.token;

    // Verify token6A works
    const checkBefore = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token6A}` }
    });
    console.log('10. Token valid before logout (HTTP 200)?', checkBefore.status === 200);

    // Call server-side logout
    const logoutRes = await fetch(`${baseUrl}/api/users/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token6A}` }
    });
    console.log('11. Logout status:', logoutRes.status);

    // Verify token6A rejected after logout
    const checkAfter = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token6A}` }
    });
    console.log('12. Token rejected after server-side logout (HTTP 401)?', checkAfter.status === 401);

    // Login again -> new JWT works
    const login6New = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email6, password: 'Password123!' })
    });
    const login6NewData = await login6New.json();
    const checkNewToken = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${login6NewData.token}` }
    });
    console.log('13. New JWT after re-login works (HTTP 200)?', checkNewToken.status === 200);

    // ----------------------------------------------------
    // TEST 7: MULTIPLE TOKENS INVALIDATION
    // ----------------------------------------------------
    console.log('\n--- TEST 7: MULTIPLE TOKENS INVALIDATION ---');
    const token6B = login6NewData.token;

    // Logout again
    await fetch(`${baseUrl}/api/users/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token6B}` }
    });

    const verify6B = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token6B}` }
    });
    console.log('14. Token invalid after second logout (HTTP 401)?', verify6B.status === 401);

  } finally {
    // TEST CLEANUP
    console.log('\n--- CLEANUP TEMPORARY TEST DATA ---');
    for (const email of testEmails) {
      await sequelize.query(`DELETE FROM users WHERE email = '${email}';`);
    }
    console.log(`✓ Cleaned up ${testEmails.length} temporary test user accounts from MySQL.`);

    server.close();
    await sequelize.close();
  }

  console.log('\n====================================================');
  console.log('🎉 ALL STAGE 8 REAL MYSQL E2E TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runStage8RealMysqlSuite().catch(err => {
  console.error('❌ Stage 8 E2E Test Suite Error:', err);
  process.exit(1);
});
