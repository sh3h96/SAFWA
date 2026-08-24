const http = require('http');
const net = require('net');

function makeRequest(app, method, path, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {}
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      let payload = '';
      if (body) {
        payload = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => { responseData += chunk; });
        res.on('end', () => {
          server.close();
          let json = null;
          try {
            json = JSON.parse(responseData);
          } catch (e) {
            json = responseData;
          }
          resolve({ statusCode: res.statusCode, headers: res.headers, body: json, rawText: responseData });
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (body) {
        req.write(payload);
      }
      req.end();
    });
  });
}

async function runBatch6Tests() {
  process.env.NODE_ENV = 'test';
  console.log('=== BATCH 6.1 SERVER STARTUP & REFACTORING INTEGRATION TESTS ===\n');

  // TEST 1: Require server.js
  console.log('Testing TEST 1: Require ./server...');
  const app = require('../server');
  console.log('✔ TEST 1 PASSED: require("./server") executed cleanly without hanging or crashing');

  // TEST 2: Exported value is valid Express app
  console.log('Testing TEST 2: Exported app validation...');
  if (!app || typeof app !== 'function' || typeof app.use !== 'function') {
    throw new Error('TEST 2 Failed: Exported value from server.js is not a valid Express app instance');
  }
  console.log('✔ TEST 2 PASSED: Exported value is a valid Express app instance');

  // TEST 3: Verify no auto port binding on require
  console.log('Testing TEST 3: Verify no automatic app.listen() on require...');
  await new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      reject(new Error('TEST 3 Failed: Server automatically started listening on port 5000 upon require()'));
    });
    socket.on('error', () => {
      // Error means port 5000 is NOT bound, which is expected!
      socket.destroy();
      resolve();
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve();
    });
    socket.connect(5000, '127.0.0.1');
  });
  console.log('✔ TEST 3 PASSED: require("./server") did not bind to port 5000 automatically');

  // TEST 4: Unmapped route returns 404 JSON (not HTML)
  console.log('Testing TEST 4: Unmapped route JSON 404 fallback...');
  const r4 = await makeRequest(app, 'GET', '/api/unmapped-route-xyz');
  if (r4.statusCode !== 404) {
    throw new Error(`TEST 4 Failed: Expected HTTP 404 for unmapped route, got ${r4.statusCode}`);
  }
  if (typeof r4.body !== 'object' || !r4.body.message) {
    throw new Error(`TEST 4 Failed: Expected JSON response with message for 404 route, got: ${r4.rawText}`);
  }
  console.log(`✔ TEST 4 PASSED: Unmapped route returned HTTP 404 with JSON: ${JSON.stringify(r4.body)}`);

  // TEST 5: Express error pipeline handled by Global Error Middleware
  console.log('Testing TEST 5: Express Global Error Handler...');
  const r5 = await makeRequest(app, 'GET', '/api/test-error');
  if (r5.statusCode !== 500) {
    throw new Error(`TEST 5 Failed: Expected HTTP 500 from global error handler, got ${r5.statusCode}`);
  }
  if (typeof r5.body !== 'object' || !r5.body.message) {
    throw new Error(`TEST 5 Failed: Expected JSON response from global error handler, got: ${r5.rawText}`);
  }
  console.log(`✔ TEST 5 PASSED: Simulated error handled by Global Error Handler with HTTP 500 JSON: ${JSON.stringify(r5.body)}`);

  // TEST 6: RBAC Auth integration contract intact
  console.log('Testing TEST 6: Auth & RBAC contract preservation...');
  const r6 = await makeRequest(app, 'GET', '/api/users');
  if (r6.statusCode !== 401) {
    throw new Error(`TEST 6 Failed: Missing token on protected route returned ${r6.statusCode}, expected 401`);
  }
  console.log('✔ TEST 6 PASSED: Auth middleware intact, GET /api/users without token returned HTTP 401 Unauthorized');

  console.log('\n=== ALL BATCH 6.1 TESTS PASSED SUCCESSFULLY! ===');
}

runBatch6Tests().catch(err => {
  console.error('\n✖ BATCH 6.1 TEST FAILED:', err);
  process.exit(1);
});
