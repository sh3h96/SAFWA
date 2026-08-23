const { clearAllRateLimits, recordLoginFailure, resetLoginFailure, getAttemptState } = require('./middleware/loginRateLimiter');

async function testProgressiveRateLimiter() {
  console.log('==================================================');
  console.log('STARTING PROGRESSIVE RATE LIMITER DIRECT TEST');
  console.log('==================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond, msg) {
    total++;
    if (cond) {
      console.log(`[PASS] Test ${total}: ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${msg}`);
    }
  }

  clearAllRateLimits();

  const req = {
    ip: '127.0.0.1',
    body: { email: 'ratetest@safwa.sa' }
  };

  // 1-4 failures
  for (let i = 1; i <= 4; i++) {
    recordLoginFailure(req);
    const state = getAttemptState(req);
    assert(state.count === i && state.blockUntil === 0, `Attempt ${i}: count is ${i}, no block set`);
  }

  // 5th failure -> triggers ~60s block
  recordLoginFailure(req);
  const state5 = getAttemptState(req);
  assert(state5.count === 5 && state5.blockUntil > Date.now(), 'Attempt 5: triggers temporary lockout');

  // 10th failure -> triggers ~300s block
  for (let i = 6; i <= 10; i++) {
    recordLoginFailure(req);
  }
  const state10 = getAttemptState(req);
  assert(state10.count === 10 && (state10.blockUntil - Date.now() > 200000), 'Attempt 10: triggers ~5 min lockout');

  // 15th failure -> triggers ~900s block ceiling
  for (let i = 11; i <= 15; i++) {
    recordLoginFailure(req);
  }
  const state15 = getAttemptState(req);
  assert(state15.count === 15 && (state15.blockUntil - Date.now() > 800000), 'Attempt 15: reaches 15-minute lockout ceiling');

  // Successful login resets state
  resetLoginFailure(req);
  const resetState = getAttemptState(req);
  assert(resetState.count === 0 && resetState.blockUntil === 0, 'Successful login resets failure state to 0');

  console.log(`\nRate Limiter Summary: ${passed}/${total} PASSED\n`);
  if (passed !== total) process.exit(1);
}

testProgressiveRateLimiter().catch(err => {
  console.error(err);
  process.exit(1);
});
