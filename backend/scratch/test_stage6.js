const escapeHtml = require('../utils/htmlEscape');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const app = require('../server');
const http = require('http');

async function runStage6Tests() {
  console.log('=== STAGE 6 COMPLETE SECURITY SUITE ===');

  // Test 1: HTML Escaping
  const maliciousName = '<script>alert("XSS & Injection")</script>';
  const escapedName = escapeHtml(maliciousName);
  console.log('1. HTML Escaping Works?', escapedName === '&lt;script&gt;alert(&quot;XSS &amp; Injection&quot;)&lt;/script&gt;');

  // Test 2: Token Generation & SHA-256 Hashing
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hash1 = crypto.createHash('sha256').update(rawToken).digest('hex');
  const hash2 = crypto.createHash('sha256').update(rawToken).digest('hex');
  console.log('2. Cryptographic token is 64 hex chars?', rawToken.length === 64);
  console.log('   SHA-256 hashing deterministic?', hash1 === hash2 && hash1 !== rawToken);

  // Test 3: HTTP Server Integration Tests
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // Test 3.1: Invalid Email for Forgot Password rejected by express-validator
    const res1 = await fetch(`${baseUrl}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email-format' })
    });
    console.log('3. Invalid email in forgot-password rejected (HTTP 400)?', res1.status === 400);

    // Test 3.2: Short Password in Reset Password rejected by express-validator
    const res2 = await fetch(`${baseUrl}/api/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'some_valid_looking_token_123', newPassword: '123' })
    });
    console.log('4. Short password in reset-password rejected (HTTP 400)?', res2.status === 400);

    // Test 3.3: Missing Token in Verify Email rejected
    const res3 = await fetch(`${baseUrl}/api/users/verify-email?token=`);
    console.log('5. Empty token in verify-email rejected (HTTP 400)?', res3.status === 400);

    // Test 3.4: Non-existent email in forgot-password returns generic message (no enumeration)
    const res4 = await fetch(`${baseUrl}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_user_xyz_987@example.com' })
    });
    const data4 = await res4.json();
    console.log('6. Non-existent email in forgot-password returns generic 200 message?', res4.status === 200 && data4.message.includes('إذا كان البريد'));

    // Test 3.5: Non-existent email in resend-verification returns generic message (no enumeration)
    const res5 = await fetch(`${baseUrl}/api/users/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_user_xyz_987@example.com' })
    });
    const data5 = await res5.json();
    console.log('7. Non-existent email in resend-verification returns generic 200 message?', res5.status === 200 && data5.message.includes('إذا كان البريد'));

  } finally {
    server.close();
  }

  console.log('=== STAGE 6 SUITE COMPLETED SUCCESSFULLY ===');
}

runStage6Tests().catch(console.error);
