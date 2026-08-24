const sequelize = require('./config/database');
const { User, AuditLog } = require('./models');
const bcrypt = require('bcrypt');

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

async function runTask20VerificationTests() {
  console.log('==================================================');
  console.log('STARTING TASK 20 VERIFICATION SUITE');
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

  // Clean up any test users from prior runs
  await User.destroy({
    where: {
      email: ['t20_email_test@safwa.sa', 't20_phone_test@safwa.sa', 't20_reg_dup@safwa.sa']
    }
  });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create a test user with Email and Phone (777888999)
  const testUser = await User.create({
    name: 'Task20 Test User',
    email: 't20_email_test@safwa.sa',
    phone: '777888999',
    password: passwordHash,
    role: 'client',
    is_email_verified: true,
    status: 'active'
  });

  try {
    // --- LOGIN CONTRACT TESTS ---
    // Test 1: Valid email + correct password
    const res1 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 't20_email_test@safwa.sa', password: 'Password123!' }
    });
    assert(res1.status === 200 && res1.data.token, 'Test 1: Valid email + correct password succeeds (200 OK)');

    // Test 2: Valid phone + correct password
    const res2 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { contact: '777888999', password: 'Password123!' }
    });
    assert(res2.status === 200 && res2.data.token, 'Test 2: Valid phone + correct password succeeds (200 OK)');

    // Test 3: Invalid email format -> validation error (400)
    const res3 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { contact: 'invalidemail@', password: 'Password123!' }
    });
    assert(res3.status === 400 && res3.data.message?.includes('بريد إلكتروني'), `Test 3: Invalid email format rejected with 400 ("${res3.data.message}")`);

    // Test 4: Invalid phone format (not matching 7XXXXXXXX) -> validation error (400)
    const res4 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { contact: '055512345', password: 'Password123!' }
    });
    assert(res4.status === 400 && (res4.data.message?.includes('رقم') || res4.data.message?.includes('7')), `Test 4: Invalid phone format rejected with 400 ("${res4.data.message}")`);

    // Test 5: Phone starting with non-7 (677123456) -> rejected with 400
    const res5 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { contact: '677123456', password: 'Password123!' }
    });
    assert(res5.status === 400, 'Test 5: Phone starting with non-7 rejected with 400');

    // Test 6: Phone shorter than 9 digits (77712345) -> rejected with 400
    const res6 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { contact: '77712345', password: 'Password123!' }
    });
    assert(res6.status === 400, 'Test 6: Phone shorter than 9 digits rejected with 400');

    // Test 7: Phone longer than 9 digits (7771234567) -> rejected with 400
    const res7 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { contact: '7771234567', password: 'Password123!' }
    });
    assert(res7.status === 400, 'Test 7: Phone longer than 9 digits rejected with 400');

    // Test 8: Phone containing letters (77712abc6) -> rejected with 400
    const res8 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { contact: '77712abc6', password: 'Password123!' }
    });
    assert(res8.status === 400, 'Test 8: Phone containing letters rejected with 400');

    // Test 9: Wrong password -> generic Arabic credentials error (401)
    const res9 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { contact: 't20_email_test@safwa.sa', password: 'WrongPassword123' }
    });
    assert(res9.status === 401 && res9.data.message === 'بيانات الدخول غير صحيحة', `Test 9: Wrong password returns generic 401 ("${res9.data.message}")`);

    // Test 10: Unknown valid identifier -> same generic credentials error (401)
    const res10 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { contact: '777999888', password: 'Password123!' }
    });
    assert(res10.status === 401 && res10.data.message === 'بيانات الدخول غير صحيحة', `Test 10: Unknown valid phone returns same generic 401 ("${res10.data.message}")`);

    // --- REGISTRATION CONTRACT TESTS ---
    // Test 11: Valid registration -> 201 Created
    const res11 = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Task20 Reg User',
        email: 't20_phone_test@safwa.sa',
        phone: '777111222',
        password: 'Password123!'
      }
    });
    assert(res11.status === 201, 'Test 11: Valid registration returns 201 Created');

    // Test 12: Registration invalid phone -> 400 Bad Request
    const res12 = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Task20 Invalid Phone',
        email: 't20_invalid_p@safwa.sa',
        phone: '055512345',
        password: 'Password123!'
      }
    });
    assert(res12.status === 400 && (res12.data.message?.includes('رقم') || res12.data.message?.includes('7')), `Test 12: Invalid registration phone rejected with 400 ("${res12.data.message}")`);

    // Test 13: Duplicate email registration -> unified duplicate message
    const res13 = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Duplicate Email User',
        email: 't20_email_test@safwa.sa',
        phone: '777333444',
        password: 'Password123!'
      }
    });
    assert(res13.status === 400 && res13.data.message === 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل', `Test 13: Duplicate email returns unified message ("${res13.data.message}")`);

    // Test 14: Duplicate phone registration -> SAME unified duplicate message
    const res14 = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Duplicate Phone User',
        email: 't20_new_email@safwa.sa',
        phone: '777888999',
        password: 'Password123!'
      }
    });
    assert(res14.status === 400 && res14.data.message === 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل', `Test 14: Duplicate phone returns same unified message ("${res14.data.message}")`);

    // Test 15: Multiple registration validation failures do NOT trigger login lockout
    let regFailuresPassed = true;
    for (let i = 0; i < 6; i++) {
      const resReg = await makeRequest('/auth/register', {
        method: 'POST',
        body: {
          fullName: 'Bad User',
          email: 'invalid-email',
          phone: '123',
          password: '123'
        }
      });
      if (resReg.status !== 400) {
        regFailuresPassed = false;
      }
    }

    const loginRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: {
        email: 't20_email_test@safwa.sa',
        password: 'Password123!'
      }
    });
    assert(regFailuresPassed && loginRes.status === 200, 'Test 15: Registration validation failures do NOT trigger login rate limiting');

    // Test 16: Canonical Yemeni phone number storage verification
    const createdUser = await User.findOne({ where: { email: 't20_phone_test@safwa.sa' } });
    assert(createdUser && createdUser.phone === '777111222', 'Test 16: Yemeni phone number stored in canonical 9-digit format (777111222)');

  } finally {
    // Cleanup created test users
    await User.destroy({
      where: {
        email: ['t20_email_test@safwa.sa', 't20_phone_test@safwa.sa', 't20_reg_dup@safwa.sa']
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

runTask20VerificationTests().catch(err => {
  console.error('Fatal error in Task 20 Verification Suite:', err);
  process.exit(1);
});
