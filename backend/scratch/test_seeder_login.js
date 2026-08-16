const http = require('http');
const app = require('../server');
const sequelize = require('../config/database');

async function verifySeededUsersAndLogin() {
  console.log('====================================================');
  console.log('🔍 VERIFYING SEEDED USERS & AUTHENTICATION');
  console.log('====================================================');

  await sequelize.authenticate();
  console.log('✓ Connected to MySQL database');

  const [users] = await sequelize.query(`
    SELECT id, name, email, role, status, is_email_verified, token_version, 
           verification_token_hash, reset_token_hash, password
    FROM users;
  `);

  console.log(`✓ Total seeded users: ${users.length}`);
  console.table(users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    verified: u.is_email_verified,
    tokenVersion: u.token_version,
    verifHash: u.verification_token_hash,
    resetHash: u.reset_token_hash,
    passwordIsBcrypt: u.password.startsWith('$2b$') || u.password.startsWith('$2a$')
  })));

  // Start Express test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Express test server listening on port ${port}`);

  const rolesToTest = [
    { role: 'admin', email: 'admin@safwa.sa' },
    { role: 'receptionist', email: 'receptionist@safwa.sa' },
    { role: 'mechanic', email: 'mechanic@safwa.sa' },
    { role: 'client', email: 'client@safwa.sa' }
  ];

  try {
    for (const testCase of rolesToTest) {
      const res = await fetch(`${baseUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testCase.email, password: 'password123' })
      });
      const data = await res.json();
      console.log(`Login test for ${testCase.role} (${testCase.email}): HTTP ${res.status}`);
      if (res.status !== 200 || !data.token) {
        throw new Error(`Login failed for ${testCase.role} (${testCase.email})`);
      }
      console.log(`   ✓ JWT Issued successfully for ${testCase.role}`);
    }
  } finally {
    server.close();
    await sequelize.close();
  }

  console.log('====================================================');
  console.log('🎉 SEEDED USERS & AUTHENTICATION VERIFIED 100% PERFECTLY!');
  console.log('====================================================');
}

verifySeededUsersAndLogin().catch(err => {
  console.error('❌ Seeder Verification Failed:', err);
  process.exit(1);
});
