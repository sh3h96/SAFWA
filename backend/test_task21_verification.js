const sequelize = require('./config/database');
const { User } = require('./models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const API_URL = 'http://localhost:5000/api';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }

  return {
    status: response.status,
    data
  };
}

async function runTask21VerificationTests() {
  console.log('==================================================');
  console.log('STARTING TASK 21 VERIFICATION SUITE');
  console.log('==================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  // Cleanup pre-existing test users
  await User.destroy({
    where: {
      email: ['t21_user@safwa.sa', 't21_expired@safwa.sa', 't21_reset@safwa.sa', 't21_resend@safwa.sa']
    }
  });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  try {
    // --- 1. REGISTRATION & VERIFICATION LINK GENERATION ---
    const regRes = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Task21 User',
        email: 't21_user@safwa.sa',
        phone: '777123999',
        password: 'Password123!'
      }
    });

    assert(regRes.status === 201, 'Test 1: User registration succeeds (201 Created)');

    const createdUser = await User.findOne({ where: { email: 't21_user@safwa.sa' } });
    assert(createdUser && createdUser.is_email_verified === false, 'Test 2: Account created with is_email_verified === false');
    assert(createdUser.verification_token_hash !== null, 'Test 3: Verification token hash stored in database');
    assert(createdUser.verification_token_expires_at > new Date(), 'Test 4: Verification token expiration set in future (24 hours)');

    // --- 2. BACKEND VERIFICATION CONTRACT ---
    // Test missing token
    const resNoToken = await makeRequest('/auth/verify-email?token=', { method: 'GET' });
    assert(resNoToken.status === 400 && resNoToken.data.message === 'رمز التحقق مطلوب', 'Test 5: Missing token rejected with 400 ("رمز التحقق مطلوب")');

    // Test invalid token
    const resInvalidToken = await makeRequest('/auth/verify-email?token=invalid_token_string_1234567890', { method: 'GET' });
    assert(resInvalidToken.status === 400 && resInvalidToken.data.message === 'رمز التفعيل غير صالح أو تم استخدامه سابقاً', 'Test 6: Invalid token rejected with 400 ("رمز التفعيل غير صالح أو تم استخدامه سابقاً")');

    // Test expired token
    const rawExpiredToken = crypto.randomBytes(32).toString('hex');
    const expiredTokenHash = crypto.createHash('sha256').update(rawExpiredToken).digest('hex');
    const expiredUser = await User.create({
      name: 'Expired Token User',
      email: 't21_expired@safwa.sa',
      phone: '777123888',
      password: passwordHash,
      role: 'client',
      is_email_verified: false,
      verification_token_hash: expiredTokenHash,
      verification_token_expires_at: new Date(Date.now() - 1000 * 60) // 1 minute ago
    });

    const resExpired = await makeRequest(`/auth/verify-email?token=${rawExpiredToken}`, { method: 'GET' });
    assert(resExpired.status === 400 && resExpired.data.message.includes('انتهت صلاحية'), 'Test 7: Expired token rejected with 400 ("انتهت صلاحية رابط التفعيل")');

    // Manually fetch token hash for createdUser and test valid verification
    // Since we know verification_token_hash is sha256(rawToken), we can test verification by assigning a known raw token
    const rawValidToken = crypto.randomBytes(32).toString('hex');
    const validTokenHash = crypto.createHash('sha256').update(rawValidToken).digest('hex');
    await createdUser.update({
      verification_token_hash: validTokenHash,
      verification_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    // Test successful verification
    const resValid = await makeRequest(`/auth/verify-email?token=${rawValidToken}`, { method: 'GET' });
    assert(resValid.status === 200 && resValid.data.message === 'تم تفعيل البريد الإلكتروني بنجاح', 'Test 8: Valid token verifies account (200 OK)');

    const verifiedUser = await User.findOne({ where: { email: 't21_user@safwa.sa' } });
    assert(verifiedUser.is_email_verified === true, 'Test 9: Database updated to is_email_verified === true');
    assert(verifiedUser.verification_token_hash === null, 'Test 10: Token hash set to null after verification');
    assert(verifiedUser.verification_token_expires_at === null, 'Test 11: Token expiration set to null after verification');

    // Test token reuse (already used)
    const resReuse = await makeRequest(`/auth/verify-email?token=${rawValidToken}`, { method: 'GET' });
    assert(resReuse.status === 400 && resReuse.data.message === 'رمز التفعيل غير صالح أو تم استخدامه سابقاً', 'Test 12: Reused token rejected with 400');

    // --- 3. RESEND VERIFICATION ---
    const unverifiedUser = await User.create({
      name: 'Resend Test User',
      email: 't21_resend@safwa.sa',
      phone: '777123777',
      password: passwordHash,
      role: 'client',
      is_email_verified: false
    });

    const resendRes = await makeRequest('/auth/resend-verification', {
      method: 'POST',
      body: { email: 't21_resend@safwa.sa' }
    });

    assert(resendRes.status === 200, 'Test 13: Resend verification returns 200 OK');
    assert(resendRes.data.message.includes('إذا كان البريد الإلكتروني مسجلاً لدينا'), 'Test 14: Resend returns generic non-enumerating message');
    assert(!resendRes.data.token && !resendRes.data.verificationToken, 'Test 15: Resend response does NOT expose verification token in payload');

    const resendUserAfter = await User.findOne({ where: { email: 't21_resend@safwa.sa' } });
    assert(resendUserAfter.verification_token_hash !== null, 'Test 16: Resend successfully assigned new verification token in DB');

    // Test resend for non-existent email (enumeration protection)
    const resendUnknown = await makeRequest('/auth/resend-verification', {
      method: 'POST',
      body: { email: 'nonexistent_987654@safwa.sa' }
    });
    assert(resendUnknown.status === 200 && resendUnknown.data.message.includes('إذا كان البريد الإلكتروني مسجلاً لدينا'), 'Test 17: Resend for unknown email returns same generic 200 OK');

    // --- 4. PASSWORD RESET FLOW & REGRESSION ---
    const resetUser = await User.create({
      name: 'Reset Test User',
      email: 't21_reset@safwa.sa',
      phone: '777123666',
      password: passwordHash,
      role: 'client',
      is_email_verified: true
    });

    const forgotRes = await makeRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email: 't21_reset@safwa.sa' }
    });

    assert(forgotRes.status === 200, 'Test 18: Forgot password returns 200 OK');
    assert(forgotRes.data.message.includes('إذا كان البريد الإلكتروني مسجلاً لدينا'), 'Test 19: Forgot password returns non-enumerating message');

    const userWithResetToken = await User.findOne({ where: { email: 't21_reset@safwa.sa' } });
    assert(userWithResetToken.reset_token_hash !== null, 'Test 20: Reset token hash created in DB');

    // Reset password with valid token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    await userWithResetToken.update({
      reset_token_hash: resetHash,
      reset_token_expires_at: new Date(Date.now() + 60 * 60 * 1000)
    });

    const resetSubmitRes = await makeRequest('/auth/reset-password', {
      method: 'POST',
      body: {
        token: rawResetToken,
        newPassword: 'NewPassword123!'
      }
    });

    assert(resetSubmitRes.status === 200, 'Test 21: Password reset succeeds (200 OK)');
    const updatedResetUser = await User.findOne({ where: { email: 't21_reset@safwa.sa' } });
    const isNewPasswordValid = await bcrypt.compare('NewPassword123!', updatedResetUser.password);
    assert(isNewPasswordValid, 'Test 22: New password properly hashed and functional');
    assert(updatedResetUser.reset_token_hash === null, 'Test 23: Reset token cleared after use');

    // Test login with new password
    const loginRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: {
        email: 't21_reset@safwa.sa',
        password: 'NewPassword123!'
      }
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Test 24: Login with newly reset password succeeds (200 OK)');

    // --- 5. FRONTEND URL CONTRACT CHECK ---
    const frontendUrlConfig = process.env.FRONTEND_URL || 'http://localhost:5173';
    assert(frontendUrlConfig.includes('5173'), `Test 25: FRONTEND_URL is configured to Vite port (${frontendUrlConfig})`);
    assert(!frontendUrlConfig.includes('5000') && !frontendUrlConfig.includes('3000'), 'Test 26: FRONTEND_URL does not point to backend port (5000) or obsolete React port (3000)');

  } finally {
    // Cleanup test users
    await User.destroy({
      where: {
        email: ['t21_user@safwa.sa', 't21_expired@safwa.sa', 't21_reset@safwa.sa', 't21_resend@safwa.sa']
      }
    });
  }

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passedCount}/${passedCount + failedCount} TESTS PASSED`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTask21VerificationTests().catch(err => {
  console.error('Fatal error in Task 21 Verification Suite:', err);
  process.exit(1);
});
