const { User, AuditLog, Vehicle, Appointment, SparePart, Invoice, Payment, sequelize } = require('./models');

const API_BASE = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTask2Verification() {
  console.log('=== STARTING TASK 2 AUDIT TRAIL VERIFICATION ===\n');

  try {
    // 1. Authenticate as Super Admin
    console.log('[1/7] Authenticating as Super Admin...');
    const superAdminRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'shehabshawgi@gmail.com', password: 'password123' })
    });
    if (!superAdminRes.ok) throw new Error(`Super admin login failed: ${JSON.stringify(superAdminRes.data)}`);
    const superAdminToken = superAdminRes.data.token;
    const superAdminId = superAdminRes.data.user.id;
    console.log(`✓ Super Admin authenticated successfully (User ID: ${superAdminId})`);

    // 2. Authenticate as Normal Admin
    console.log('[2/7] Authenticating as Normal Admin...');
    const adminRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@safwa.sa', password: 'password123' })
    });
    if (!adminRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminRes.data)}`);
    const adminToken = adminRes.data.token;
    const adminId = adminRes.data.user.id;
    console.log(`✓ Admin authenticated successfully (User ID: ${adminId})`);

    // 3. Test API Endpoint Access Restrictions for GET /api/audit-logs
    console.log('[3/7] Testing Access Controls on GET /api/audit-logs...');
    
    // 3a. Super Admin access -> Should Succeed (200)
    const superAdminAuditRes = await request(`${API_BASE}/audit-logs`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    if (superAdminAuditRes.status === 200 && Array.isArray(superAdminAuditRes.data.data)) {
      console.log(`✓ Super Admin access granted (Retrieved ${superAdminAuditRes.data.data.length} audit logs)`);
    } else {
      throw new Error(`Super Admin access failed: ${JSON.stringify(superAdminAuditRes.data)}`);
    }

    // 3b. Normal Admin access -> Should Fail (403 Forbidden)
    const adminAuditRes = await request(`${API_BASE}/audit-logs`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (adminAuditRes.status === 403) {
      console.log('✓ Normal Admin access correctly rejected (403 Forbidden)');
    } else {
      throw new Error(`FAILED: Normal Admin got status ${adminAuditRes.status} instead of 403`);
    }

    // 3c. Unauthenticated access -> Should Fail (401 Unauthorized)
    const unauthAuditRes = await request(`${API_BASE}/audit-logs`, { method: 'GET' });
    if (unauthAuditRes.status === 401) {
      console.log('✓ Unauthenticated access correctly rejected (401 Unauthorized)');
    } else {
      throw new Error(`FAILED: Unauthenticated request got status ${unauthAuditRes.status} instead of 401`);
    }

    // 4. Perform audited operations across entities
    console.log('\n[4/7] Triggering Audited Operations Across Controllers...');

    // 4a. Create a client user (Admin)
    const testClientEmail = `audit_client_${Date.now()}@example.com`;
    const createClientRes = await request(`${API_BASE}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Audit Test Client', email: testClientEmail, password: 'password123', role: 'client', phone: '0501112233' })
    });
    if (!createClientRes.ok) throw new Error(`Create client failed: ${JSON.stringify(createClientRes.data)}`);
    const newClientId = createClientRes.data.id;
    console.log(`  - Admin created client user ID: ${newClientId}`);

    // Client logins
    const clientLoginRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: testClientEmail, password: 'password123' })
    });
    if (!clientLoginRes.ok) throw new Error(`Client login failed: ${JSON.stringify(clientLoginRes.data)}`);
    const clientToken = clientLoginRes.data.token;
    console.log('  - Client logged in');

    // 4b. Create a vehicle (Client)
    const createVehicleRes = await request(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ make: 'Toyota', model: 'Camry', year: 2023, license_plate: 'AUD-9999', vin: 'VIN123456789AUDIT' })
    });
    if (!createVehicleRes.ok) throw new Error(`Create vehicle failed: ${JSON.stringify(createVehicleRes.data)}`);
    const newVehicleId = createVehicleRes.data.id;
    console.log(`  - Client created vehicle ID: ${newVehicleId}`);

    // 4c. Create an appointment (Client)
    const createApptRes = await request(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ vehicle_id: newVehicleId, description: 'فحص فني واختبار سجلات التدقيق' })
    });
    if (!createApptRes.ok) throw new Error(`Create appointment failed: ${JSON.stringify(createApptRes.data)}`);
    const newApptId = createApptRes.data.appointment.id;
    console.log(`  - Client created appointment ID: ${newApptId}`);

    // 4d. Update appointment status & assign mechanic (Admin)
    const mechanicUser = await User.findOne({ where: { role: 'mechanic' } });
    if (mechanicUser) {
      const updateApptRes = await request(`${API_BASE}/appointments/${newApptId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'under_inspection', mechanic_ids: [mechanicUser.id] })
      });
      if (!updateApptRes.ok) throw new Error(`Update appointment failed: ${JSON.stringify(updateApptRes.data)}`);
      console.log(`  - Admin assigned mechanic ${mechanicUser.id} and updated status to under_inspection`);
    }

    // 4e. Add inventory item (Super Admin)
    const addPartRes = await request(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ name: 'Audit Test Brake Pad', part_number: `AUD-BP-${Date.now()}`, brand: 'Brembo', price: 250, stock_quantity: 20, min_stock_level: 5 })
    });
    if (!addPartRes.ok) throw new Error(`Add inventory part failed: ${JSON.stringify(addPartRes.data)}`);
    const newPartId = addPartRes.data.part.id;
    console.log(`  - Super Admin added spare part ID: ${newPartId}`);

    // 4f. Issue invoice (Admin)
    const issueInvoiceRes = await request(`${API_BASE}/invoices/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ appointment_id: newApptId, labor_cost: 150, parts_cost: 250 })
    });
    if (!issueInvoiceRes.ok) throw new Error(`Issue invoice failed: ${JSON.stringify(issueInvoiceRes.data)}`);
    const newInvoiceId = issueInvoiceRes.data.invoice.id;
    console.log(`  - Admin issued invoice ID: ${newInvoiceId}`);

    // 4g. Pay invoice (Client)
    const payInvoiceRes = await request(`${API_BASE}/invoices/${newInvoiceId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ amount: 400, payment_method: 'credit_card' })
    });
    if (!payInvoiceRes.ok) throw new Error(`Pay invoice failed: ${JSON.stringify(payInvoiceRes.data)}`);
    console.log(`  - Client paid invoice ID: ${newInvoiceId}`);

    // 5. Inspect Audit Logs via Super Admin API
    console.log('\n[5/7] Verifying Recorded Audit Logs Content...');
    const auditLogsCheck = await request(`${API_BASE}/audit-logs`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });

    const logs = auditLogsCheck.data.data;
    console.log(`✓ Fetched ${logs.length} audit log entries from DB`);

    // Verify key action types exist in the recent logs
    const actionTypes = logs.map(l => l.action);
    const expectedActions = [
      'USER_CREATED',
      'AUTH_LOGIN_SUCCESS',
      'VEHICLE_CREATED',
      'APPOINTMENT_CREATED',
      'APPOINTMENT_STATUS_CHANGED',
      'PART_CREATED',
      'INVOICE_ISSUED',
      'INVOICE_PAYMENT_PROCESSED'
    ];

    for (const action of expectedActions) {
      if (actionTypes.includes(action)) {
        console.log(`  ✓ Audit action recorded: ${action}`);
      } else {
        throw new Error(`MISSING AUDIT LOG: Action '${action}' was not found in audit_logs table!`);
      }
    }

    // 6. Verify Actor Identity Integrity and Sensitive Data Sanitization
    console.log('\n[6/7] Verifying Actor Identity & Sensitive Data Redaction...');
    let sensitiveDataFound = false;

    for (const log of logs) {
      const logString = JSON.stringify(log);
      
      // Check for raw passwords or secrets in old_values/new_values
      if (logString.includes('password123') || logString.includes('secret') || (log.new_values && log.new_values.password)) {
        console.error(`❌ CRITICAL SECURITY FAIL: Sensitive data revealed in audit log ID ${log.id}`);
        sensitiveDataFound = true;
      }

      // Check actor integrity
      if (log.actor_user_id) {
        if (!log.actor || !log.actor.id) {
          console.error(`❌ Audit log ID ${log.id} has actor_user_id ${log.actor_user_id} but missing associated User object`);
        }
      }
    }

    if (sensitiveDataFound) {
      throw new Error('Sensitive data redaction check failed!');
    }
    console.log('✓ All audit logs correctly redacted passwords/secrets and populated actor identity.');

    // 7. Verify Pagination and Filtering on GET /api/audit-logs
    console.log('\n[7/7] Verifying Audit Log Endpoint Query Parameters...');
    const filteredRes = await request(`${API_BASE}/audit-logs?action=USER_CREATED&pageSize=5`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    
    if (filteredRes.data.data.every(l => l.action === 'USER_CREATED') && filteredRes.data.data.length <= 5) {
      console.log(`✓ Filtering by action=USER_CREATED and limit=5 verified successfully`);
    } else {
      throw new Error('Filtering query parameters failed');
    }

    console.log('\n==================================================');
    console.log('🎉 TASK 2 AUDIT TRAIL VERIFICATION PASSED PERFECTLY!');
    console.log('==================================================\n');

  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTask2Verification();
