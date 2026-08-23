/**
 * Progressive Login Rate Limiter Middleware
 * 
 * Escalation Policy:
 * - Attempts 1 to 4: Normal attempts allowed.
 * - 5 to 9 failed attempts: 1 minute (60s) temporary block.
 * - 10 to 14 failed attempts: 5 minutes (300s) temporary block.
 * - 15+ failed attempts: 15 minutes (900s) maximum ceiling lockout.
 * 
 * Rules:
 * - Applies ONLY to LOGIN attempts.
 * - Resets on successful login.
 * - Validation 400 errors (malformed input) do NOT trigger failure count.
 * - Registration requests DO NOT use this limiter.
 */

const attemptsStore = new Map();

// Periodic cleanup of stale attempt records (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of attemptsStore.entries()) {
    if (data.blockUntil && data.blockUntil < now && (now - data.lastFailedAt > 15 * 60 * 1000)) {
      attemptsStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

const getKey = (req) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const input = (req.body?.email || req.body?.contact || req.body?.identifier || req.body?.phone || '').trim().toLowerCase();
  return `${ip}:${input}`;
};

const getBlockDurationSeconds = (failedCount) => {
  if (failedCount < 5) return 0;
  if (failedCount < 10) return 60;        // ~1 minute for 5-9 attempts
  if (failedCount < 15) return 300;       // 5 minutes for 10-14 attempts
  return 900;                             // 15 minutes max ceiling for 15+ attempts
};

const loginRateLimiter = (req, res, next) => {
  // Skip rate limiting in test environment unless explicitly testing rate limiter
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
    return next();
  }

  const key = getKey(req);
  const record = attemptsStore.get(key);
  const now = Date.now();

  if (record && record.blockUntil && now < record.blockUntil) {
    const remainingSecs = Math.ceil((record.blockUntil - now) / 1000);
    return res.status(429).json({
      message: 'تم تجاوز عدد محاولات تسجيل الدخول المسموح بها، يرجى المحاولة لاحقًا.',
      retryAfterSeconds: remainingSecs
    });
  }

  next();
};

const recordLoginFailure = (req) => {
  const key = getKey(req);
  const now = Date.now();
  const record = attemptsStore.get(key) || { count: 0, lastFailedAt: now, blockUntil: 0 };

  record.count += 1;
  record.lastFailedAt = now;

  const durationSecs = getBlockDurationSeconds(record.count);
  if (durationSecs > 0) {
    record.blockUntil = now + durationSecs * 1000;
  } else {
    record.blockUntil = 0;
  }

  attemptsStore.set(key, record);
  return record;
};

const resetLoginFailure = (req) => {
  const key = getKey(req);
  attemptsStore.delete(key);
};

const getAttemptState = (req) => {
  const key = getKey(req);
  return attemptsStore.get(key) || { count: 0, blockUntil: 0 };
};

const clearAllRateLimits = () => {
  attemptsStore.clear();
};

module.exports = {
  loginRateLimiter,
  recordLoginFailure,
  resetLoginFailure,
  getAttemptState,
  clearAllRateLimits
};
