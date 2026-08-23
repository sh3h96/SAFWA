const crypto = require('crypto');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

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

async function runTask24Round3Verification() {
  console.log('==================================================');
  console.log('STARTING TASK 24 ROUND 3 VERIFICATION SUITE');
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

  try {
    const { User } = require('./models');

    // 1. Setup a clean test token for client@safwa.sa
    const testUser = await User.findOne({ where: { email: 'client@safwa.sa' } });
    assert(!!testUser, 'Test 1: Test user client@safwa.sa exists in database');

    const currentHashBefore = testUser.password;
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    await testUser.update({
      reset_token_hash: resetTokenHash,
      reset_token_expires_at: resetTokenExpiresAt
    });

    // 2. Attempt password reset using CURRENT password ("password123")
    const resReuse = await makeRequest('/users/reset-password', {
      method: 'POST',
      body: {
        token: rawResetToken,
        newPassword: 'password123'
      }
    });

    assert(resReuse.status === 400, 'Test 2: Password reset using current password rejected with 400 Bad Request');
    assert(resReuse.data.message === 'لا يمكن استخدام كلمة المرور الحالية. يرجى اختيار كلمة مرور جديدة.', 'Test 3: Password reset reuse returns exact Arabic error message');

    // Verify DB hash was NOT changed
    const userAfterReuse = await User.findOne({ where: { email: 'client@safwa.sa' } });
    assert(userAfterReuse.password === currentHashBefore, 'Test 4: Rejected password reuse does NOT modify stored password hash');

    // 3. Attempt password reset using a Genuinely NEW password ("newPassword123!")
    const resNew = await makeRequest('/users/reset-password', {
      method: 'POST',
      body: {
        token: rawResetToken,
        newPassword: 'newPassword123!'
      }
    });

    assert(resNew.status === 200, 'Test 5: Password reset using genuinely new password succeeds with 200 OK');

    const userAfterReset = await User.findOne({ where: { email: 'client@safwa.sa' } });
    const isNewPasswordValid = await bcrypt.compare('newPassword123!', userAfterReset.password);
    assert(isNewPasswordValid, 'Test 6: Database password hash updated to new password');

    // Reset password back to canonical "password123" for test suite repeatability
    const canonicalHash = await bcrypt.hash('password123', 10);
    await userAfterReset.update({ password: canonicalHash });

    // 4. Authenticated change-password API test
    const loginRes = await makeRequest('/users/login', {
      method: 'POST',
      body: {
        identifier: 'client@safwa.sa',
        password: 'password123'
      }
    });

    const authToken = loginRes.data.token;
    assert(!!authToken, 'Test 7: Login succeeds to obtain JWT token for authenticated change-password test');

    // Attempt authenticated change-password using current password as new password
    const resAuthReuse = await makeRequest('/users/change-password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        currentPassword: 'password123',
        newPassword: 'password123'
      }
    });

    assert(resAuthReuse.status === 400, 'Test 8: Authenticated change-password using current password rejected with 400');
    assert(resAuthReuse.data.message === 'لا يمكن استخدام كلمة المرور الحالية. يرجى اختيار كلمة مرور جديدة.', 'Test 9: Authenticated change-password reuse returns exact Arabic error message');

    // 5. Audit PasswordResetPage frontend code features
    const resetPageCode = fs.readFileSync(path.join(__dirname, '../frontend/src/pages/auth/PasswordResetPage.jsx'), 'utf8');
    const hasShowPassword = resetPageCode.includes('showPassword') && resetPageCode.includes('showConfirmPassword');
    const hasStrength = resetPageCode.includes('getPasswordStrength');
    const hasMismatchText = resetPageCode.includes('كلمتا المرور غير متطابقتين');

    assert(hasShowPassword, 'Test 10: PasswordResetPage contains independent show/hide toggles for both password fields');
    assert(hasStrength, 'Test 11: PasswordResetPage contains password strength meter logic matching RegisterPage');
    assert(hasMismatchText, 'Test 12: PasswordResetPage contains password mismatch feedback text');

  } catch (err) {
    console.error('\n❌ UNEXPECTED ERROR IN TASK 24 ROUND 3 VERIFICATION:', err);
    failedCount++;
  }

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passedCount}/${passedCount + failedCount} TESTS PASSED`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTask24Round3Verification();
