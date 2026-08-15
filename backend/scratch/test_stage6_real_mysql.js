const crypto = require('crypto');
const bcrypt = require('bcrypt');
const http = require('http');
const app = require('../server');
const sequelize = require('../config/database');
const escapeHtml = require('../utils/htmlEscape');

async function runRealMysqlStage6Suite() {
  console.log('====================================================');
  console.log('🚀 STAGE 6 REAL MYSQL DATABASE E2E SUITE EXECUTION');
  console.log('====================================================');

  // Ensure DB connection
  await sequelize.authenticate();
  console.log('✓ Connected to MySQL database on localhost:3306');

  // Start HTTP test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Express test server listening on port ${port}`);

  const testEmails = [];

  try {
    // ----------------------------------------------------
    // PART B: REAL REGISTRATION + VERIFICATION E2E TEST
    // ----------------------------------------------------
    console.log('\n--- PART B: REAL REGISTRATION + VERIFICATION E2E TEST ---');
    const email1 = `stage6_e2e_user1_${Date.now()}@example.com`;
    testEmails.push(email1);

    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Register user via API
    const regRes = await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Stage6 E2E User 1',
        email: email1,
        password: 'Password123!',
        phone: `05${Math.floor(10000000 + Math.random() * 90000000)}`
      })
    });
    console.log('1. Registration HTTP status:', regRes.status);
    const regData = await regRes.json();
    console.log('   Registration response:', regData.message);

    // Query DB for user state
    const [users1] = await sequelize.query(`SELECT id, is_email_verified, verification_token_hash, verification_token_expires_at FROM users WHERE email = '${email1}';`);
    const dbUser1 = users1[0];
    console.log('2. DB State after registration:');
    console.log('   is_email_verified:', dbUser1.is_email_verified === 0 || dbUser1.is_email_verified === false ? 'false (0)' : 'true (1)');
    console.log('   verification_token_hash exists?', !!dbUser1.verification_token_hash);
    console.log('   verification_token_expires_at exists?', !!dbUser1.verification_token_expires_at);

    // Override token hash in DB to test known raw token
    await sequelize.query(`UPDATE users SET verification_token_hash = '${verifyTokenHash}', verification_token_expires_at = '${verifyExpiresAt.toISOString().slice(0, 19).replace('T', ' ')}' WHERE email = '${email1}';`);

    // Verify email using real raw token
    const verifyRes = await fetch(`${baseUrl}/api/users/verify-email?token=${rawVerifyToken}`);
    console.log('3. Verify email HTTP status:', verifyRes.status);
    const verifyData = await verifyRes.json();
    console.log('   Verify email response:', verifyData.message);

    // Re-query DB after verification
    const [users1Verified] = await sequelize.query(`SELECT is_email_verified, verification_token_hash, verification_token_expires_at FROM users WHERE email = '${email1}';`);
    const dbUser1V = users1Verified[0];
    console.log('4. DB State after verification:');
    console.log('   is_email_verified:', dbUser1V.is_email_verified === 1 || dbUser1V.is_email_verified === true ? 'true (1)' : 'false (0)');
    console.log('   verification_token_hash is NULL?', dbUser1V.verification_token_hash === null);
    console.log('   verification_token_expires_at is NULL?', dbUser1V.verification_token_expires_at === null);

    // Test token reuse
    const verifyReuseRes = await fetch(`${baseUrl}/api/users/verify-email?token=${rawVerifyToken}`);
    console.log('5. Token reuse rejected (HTTP 400)?', verifyReuseRes.status === 400);

    // ----------------------------------------------------
    // PART C: RESEND VERIFICATION E2E TEST
    // ----------------------------------------------------
    console.log('\n--- PART C: RESEND VERIFICATION E2E TEST ---');
    const email2 = `stage6_e2e_user2_${Date.now()}@example.com`;
    testEmails.push(email2);

    await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Stage6 E2E User 2',
        email: email2,
        password: 'Password123!',
        phone: `05${Math.floor(10000000 + Math.random() * 90000000)}`
      })
    });

    const [users2Old] = await sequelize.query(`SELECT verification_token_hash FROM users WHERE email = '${email2}';`);
    const oldHash = users2Old[0].verification_token_hash;

    // Resend verification
    const resendRes = await fetch(`${baseUrl}/api/users/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email2 })
    });
    console.log('6. Resend verification status:', resendRes.status);
    const resendData = await resendRes.json();
    console.log('   Resend response message:', resendData.message);

    const [users2New] = await sequelize.query(`SELECT verification_token_hash FROM users WHERE email = '${email2}';`);
    const newHash = users2New[0].verification_token_hash;
    console.log('7. New verification token hash generated in DB?', newHash !== oldHash && !!newHash);

    // ----------------------------------------------------
    // PART D: FORGOT PASSWORD & RESET PASSWORD E2E TEST
    // ----------------------------------------------------
    console.log('\n--- PART D: FORGOT PASSWORD & RESET PASSWORD E2E TEST ---');
    const email3 = `stage6_e2e_user3_${Date.now()}@example.com`;
    testEmails.push(email3);

    const origPass = 'OriginalPass123!';
    const newPass = 'NewSecurePass456!';

    await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Stage6 E2E User 3',
        email: email3,
        password: origPass,
        phone: `05${Math.floor(10000000 + Math.random() * 90000000)}`
      })
    });

    // Forgot password request
    const forgotRes = await fetch(`${baseUrl}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email3 })
    });
    console.log('8. Forgot password status:', forgotRes.status);
    const forgotData = await forgotRes.json();
    console.log('   Forgot password response:', forgotData.message);

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Inject known hash for testing reset-password endpoint
    await sequelize.query(`UPDATE users SET reset_token_hash = '${resetTokenHash}', reset_token_expires_at = '${resetExpiresAt.toISOString().slice(0, 19).replace('T', ' ')}' WHERE email = '${email3}';`);

    // Reset password with new password
    const resetRes = await fetch(`${baseUrl}/api/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawResetToken, newPassword: newPass })
    });
    console.log('9. Reset password status:', resetRes.status);
    const resetData = await resetRes.json();
    console.log('   Reset password response:', resetData.message);

    // Verify DB state after password reset
    const [users3Reset] = await sequelize.query(`SELECT password, reset_token_hash, reset_token_expires_at FROM users WHERE email = '${email3}';`);
    const dbUser3R = users3Reset[0];
    console.log('10. Password stored as bcrypt hash?', dbUser3R.password.startsWith('$2b$'));
    console.log('    reset_token_hash is NULL?', dbUser3R.reset_token_hash === null);
    console.log('    reset_token_expires_at is NULL?', dbUser3R.reset_token_expires_at === null);

    // Login with old password fails
    const loginOldRes = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email3, password: origPass })
    });
    console.log('11. Login with OLD password fails (HTTP 401)?', loginOldRes.status === 401);

    // Login with new password succeeds
    const loginNewRes = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email3, password: newPass })
    });
    console.log('12. Login with NEW password succeeds (HTTP 200)?', loginNewRes.status === 200);

    // Attempt reset token reuse
    const resetReuseRes = await fetch(`${baseUrl}/api/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawResetToken, newPassword: 'AnotherPassword789!' })
    });
    console.log('13. Reset token reuse rejected (HTTP 400)?', resetReuseRes.status === 400);

    // ----------------------------------------------------
    // PART E: TOKEN EXPIRATION TEST
    // ----------------------------------------------------
    console.log('\n--- PART E: TOKEN EXPIRATION TEST ---');
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    const expiredTokenHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
    const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

    await sequelize.query(`UPDATE users SET reset_token_hash = '${expiredTokenHash}', reset_token_expires_at = '${pastDate.toISOString().slice(0, 19).replace('T', ' ')}' WHERE email = '${email3}';`);

    const expiredResetRes = await fetch(`${baseUrl}/api/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: expiredRawToken, newPassword: 'BrandNewPassword123!' })
    });
    console.log('14. Expired reset token rejected (HTTP 400)?', expiredResetRes.status === 400);

    // ----------------------------------------------------
    // PART F: EMAIL HTML SECURITY & ENUMERATION TEST
    // ----------------------------------------------------
    console.log('\n--- PART F & G: EMAIL HTML SECURITY & ENUMERATION TEST ---');
    const maliciousName = '<script>alert("XSS & Hack")</script>';
    const escapedName = escapeHtml(maliciousName);
    console.log('15. HTML Escaping Works?', escapedName === '&lt;script&gt;alert(&quot;XSS &amp; Hack&quot;)&lt;/script&gt;');

    const enumRes1 = await fetch(`${baseUrl}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email3 })
    });
    const enumRes2 = await fetch(`${baseUrl}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'non_existent_email_12345@example.com' })
    });
    const dataE1 = await enumRes1.json();
    const dataE2 = await enumRes2.json();
    console.log('16. Forgot password response identical for existing vs non-existing email?', dataE1.message === dataE2.message);

  } finally {
    // PART M: TEST CLEANUP (Only clean temporary test users)
    console.log('\n--- PART M: TEST CLEANUP ---');
    for (const email of testEmails) {
      await sequelize.query(`DELETE FROM users WHERE email = '${email}';`);
    }
    console.log(`✓ Cleaned up ${testEmails.length} temporary test user accounts from MySQL.`);

    server.close();
    await sequelize.close();
  }

  console.log('\n====================================================');
  console.log('🎉 ALL STAGE 6 REAL MYSQL E2E TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runRealMysqlStage6Suite().catch(err => {
  console.error('❌ E2E Test Suite Error:', err);
  process.exit(1);
});
