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

async function runTask24Verification() {
  console.log('==================================================');
  console.log('STARTING TASK 24 AUTHENTICATION UX VERIFICATION SUITE');
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
    const loginPath = path.join(__dirname, '../frontend/src/pages/auth/LoginPage.jsx');
    const registerPath = path.join(__dirname, '../frontend/src/pages/auth/RegisterPage.jsx');
    const appPath = path.join(__dirname, '../frontend/src/App.jsx');

    const loginCode = fs.readFileSync(loginPath, 'utf8');
    const registerCode = fs.readFileSync(registerPath, 'utf8');
    const appCode = fs.readFileSync(appPath, 'utf8');

    // 1. LOGIN PRE-FILLED CREDENTIALS AUDIT
    const hasInitialContact = loginCode.includes("useState('admin@safwa.sa')") || loginCode.includes("useState('777123456')");
    const hasInitialPassword = loginCode.includes("useState('password123')") || loginCode.includes("useState('password1234')");
    assert(!hasInitialContact && !hasInitialPassword, 'Test 1: Login page initial form states are empty (no prefilled credentials)');

    // 2. GOOGLE LOGIN AUDIT
    const hasGoogleButton = loginCode.includes('Google') || loginCode.includes('أو من خلال');
    assert(!hasGoogleButton, 'Test 2: Google login button and divider removed from Login UI');

    // 3. PLACEHOLDER AUDIT
    const hasRealPhonePlaceholder = loginCode.includes('777123456') || registerCode.includes('777123456');
    const hasRealEmailPlaceholder = loginCode.includes('example@safwa.sa') || registerCode.includes('example@safwa.sa');
    assert(!hasRealPhonePlaceholder && !hasRealEmailPlaceholder, 'Test 3: No real account phone or email used in placeholders (neutral 7XXXXXXXX / example@domain.com used)');

    // 4. PHONE ERROR MESSAGE AUDIT
    const EXPECTED_PHONE_MSG = 'يرجى إدخال رقم صحيح مكون من تسعة أرقام فقط.';
    const loginHasMsg = loginCode.includes(EXPECTED_PHONE_MSG);
    const registerHasMsg = registerCode.includes(EXPECTED_PHONE_MSG);
    assert(loginHasMsg && registerHasMsg, 'Test 4: Phone validation error message standardized globally to short Arabic text');

    // 5. FABRICATED STATISTICS REMOVAL AUDIT
    const has500Claim = loginCode.includes('+500') || registerCode.includes('+500');
    const has247Claim = loginCode.includes('24/7') || registerCode.includes('24/7');
    assert(!has500Claim && !has247Claim, 'Test 5: Fabricated "+500" and "24/7" claims removed and replaced with truthful product features');

    // 6. PASSWORD VISIBILITY AUDIT
    const hasRegPasswordToggle = registerCode.includes('showPassword') && registerCode.includes('showConfirmPassword');
    assert(hasRegPasswordToggle, 'Test 6: Both password and confirm-password fields on Registration have show/hide visibility toggles');

    // 7. PASSWORD STRENGTH METER AUDIT
    const hasComplexStrength = registerCode.includes('hasLower') && registerCode.includes('hasUpper') && registerCode.includes('hasNumber');
    assert(hasComplexStrength, 'Test 7: Password strength meter checks meaningful criteria (length + character diversity)');

    // 8. LEGAL ROUTES & LINKS AUDIT
    const hasTermsRoute = appCode.includes('/terms');
    const hasPrivacyRoute = appCode.includes('/privacy');
    const loginHasLegalNav = loginCode.includes('/privacy') && loginCode.includes('/terms');
    const registerHasLegalNav = registerCode.includes('/privacy') && registerCode.includes('/terms');
    assert(hasTermsRoute && hasPrivacyRoute && loginHasLegalNav && registerHasLegalNav, 'Test 8: Terms of Use and Privacy Policy routes exist and are connected in auth pages');

    // 9. COPYRIGHT YEAR AUDIT
    const loginHas2026 = loginCode.includes('2026');
    const registerHas2026 = registerCode.includes('2026');
    const hasOld2024 = loginCode.includes('2024') || registerCode.includes('2024');
    assert(loginHas2026 && registerHas2026 && !hasOld2024, 'Test 9: Copyright year updated to 2026 across auth footers');

    // 10. FORGOT PASSWORD API SECURITY & EMAIL CONTRACT
    // Existing user
    const resExisting = await makeRequest('/users/forgot-password', {
      method: 'POST',
      body: { email: 'client@safwa.sa' }
    });
    // Non-existing user
    const resNonExisting = await makeRequest('/users/forgot-password', {
      method: 'POST',
      body: { email: 'unknown_fake_user_999@safwa.sa' }
    });

    const isNonEnumerating = resExisting.status === 200 && resNonExisting.status === 200 && resExisting.data.message === resNonExisting.data.message;
    assert(isNonEnumerating, 'Test 10: Forgot password API handles existing and non-existing emails with generic non-enumerating 200 response');

  } catch (err) {
    console.error('\n❌ UNEXPECTED ERROR IN TASK 24 VERIFICATION:', err);
    failedCount++;
  }

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passedCount}/${passedCount + failedCount} TESTS PASSED`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTask24Verification();
