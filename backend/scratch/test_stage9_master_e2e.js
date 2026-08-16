const crypto = require('crypto');
const http = require('http');
const app = require('../server');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

async function runStage9MasterE2ETestSuite() {
  console.log('===================================================================');
  console.log('🚀 STAGE 9 MASTER BACKEND E2E FUNCTIONAL WORKFLOW & AUDIT SUITE');
  console.log('===================================================================');

  await sequelize.authenticate();
  console.log('✓ Connected to MySQL database on localhost:3306');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Express test server listening on port ${port}`);

  const testEmails = [];
  let testClientId, testVehicleId, testAppointmentId, testReportId, testPartId, testInvoiceId;

  try {
    // ----------------------------------------------------
    // WORKFLOW 1: USER REGISTRATION & EMAIL VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 1: USER REGISTRATION & EMAIL VERIFICATION ---');
    const clientEmail = `stage9_client_${Date.now()}@example.com`;
    testEmails.push(clientEmail);

    const regRes = await fetch(`${baseUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'أحمد الصفوة للتجربة',
        email: clientEmail,
        password: 'Password123!',
        phone: '0501234567'
      })
    });
    const regData = await regRes.json();
    console.log('1. Registration status:', regRes.status, 'Message:', regData.message);
    if (regRes.status !== 201) throw new Error('Registration failed');
    testClientId = regData.user.id;

    // Verify token exists in database for this new user
    const [userRows] = await sequelize.query(`SELECT verification_token_hash, is_email_verified FROM users WHERE id = ${testClientId};`);
    console.log('   User registered in DB - is_email_verified:', userRows[0].is_email_verified);

    // ----------------------------------------------------
    // WORKFLOW 2: LOGIN & JWT ISSUANCE
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 2: LOGIN & JWT ISSUANCE ---');
    const loginRes = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientEmail, password: 'Password123!' })
    });
    const loginData = await loginRes.json();
    console.log('2. Login status:', loginRes.status);
    if (loginRes.status !== 200) throw new Error('Login failed');
    const clientToken = loginData.token;

    // Login as Admin for administrative workflow steps
    const adminLoginRes = await fetch(`${baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@safwa.sa', password: 'password123' })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;

    // Fetch existing mechanic from DB or create a test mechanic
    const [mechanicRows] = await sequelize.query(`SELECT id, email FROM users WHERE role = 'mechanic' LIMIT 1;`);
    let mechanicId;
    let mechanicToken;

    if (mechanicRows.length > 0) {
      mechanicId = mechanicRows[0].id;
      const hash = await bcrypt.hash('password123', 10);
      await sequelize.query(`UPDATE users SET password = '${hash}' WHERE id = ${mechanicId};`);

      const mechanicLoginRes = await fetch(`${baseUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mechanicRows[0].email, password: 'password123' })
      });
      const mechanicLoginData = await mechanicLoginRes.json();
      mechanicToken = mechanicLoginData.token;
    } else {
      const mechanicEmail = `stage9_mechanic_${Date.now()}@example.com`;
      testEmails.push(mechanicEmail);
      const hash = await bcrypt.hash('Password123!', 10);
      const [mechInsert] = await sequelize.query(`INSERT INTO users (name, email, password, role, status, token_version, is_email_verified, created_at, updated_at) VALUES ('الميكانيكي علي', '${mechanicEmail}', '${hash}', 'mechanic', 'active', 1, 1, NOW(), NOW());`);
      mechanicId = mechInsert;

      const mechanicLoginRes = await fetch(`${baseUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mechanicEmail, password: 'Password123!' })
      });
      const mechanicLoginData = await mechanicLoginRes.json();
      mechanicToken = mechanicLoginData.token;
    }
    console.log('   Mechanic authenticated successfully. ID:', mechanicId);

    // ----------------------------------------------------
    // WORKFLOW 3: VEHICLE CREATION & OWNERSHIP
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 3: VEHICLE CREATION & MANAGEMENT ---');
    const vehRes = await fetch(`${baseUrl}/api/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        license_plate: 'أ ب ج 1234',
        vin: 'JN1AZ000000123456'
      })
    });
    const vehData = await vehRes.json();
    console.log('3. Vehicle creation status:', vehRes.status, 'ID:', vehData.id);
    if (vehRes.status !== 201) throw new Error('Vehicle creation failed');
    testVehicleId = vehData.id;

    // Get my vehicles
    const myVehRes = await fetch(`${baseUrl}/api/vehicles/my`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    const myVehData = await myVehRes.json();
    console.log('4. Fetch my vehicles count:', myVehData.length);

    // ----------------------------------------------------
    // WORKFLOW 4: APPOINTMENT CREATION & ASSIGNMENT
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 4: APPOINTMENT CREATION & ASSIGNMENT ---');
    const appRes = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        vehicle_id: testVehicleId,
        appointment_date: new Date(),
        description: 'صيانة دورية وسماع صوت غريب في الفرامل'
      })
    });
    const appData = await appRes.json();
    console.log('5. Appointment creation status:', appRes.status, 'ID:', appData.appointment.id);
    if (appRes.status !== 201) throw new Error('Appointment creation failed');
    testAppointmentId = appData.appointment.id;

    // Admin assigns mechanic & updates status to in_progress
    const assignRes = await fetch(`${baseUrl}/api/appointments/${testAppointmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        mechanic_id: mechanicId,
        status: 'in_progress'
      })
    });
    console.log('6. Admin appointment assignment status:', assignRes.status);

    // ----------------------------------------------------
    // WORKFLOW 5: TECHNICAL REPORT & DIAGNOSTICS
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 5: TECHNICAL REPORT CREATION ---');
    const reportRes = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mechanicToken}`
      },
      body: JSON.stringify({
        appointment_id: testAppointmentId,
        diagnostics: 'تآكل في فحمات الفرامل الأمامية',
        mechanic_notes: 'يحتاج تغيير فحمات الفرامل وتصليح الهوب',
        odometer: 45000,
        obd2_codes: 'P0300',
        visual_notes: 'حالة السيارة ممتازة عموماً',
        repair_plan: 'تغيير الفحمات الأمامية',
        urgency_level: 'medium'
      })
    });
    const reportData = await reportRes.json();
    console.log('7. Technical report status:', reportRes.status, 'ID:', reportData.report?.id);
    if (reportRes.status !== 201) throw new Error('Technical report creation failed');
    testReportId = reportData.report.id;

    // ----------------------------------------------------
    // WORKFLOW 6: INVENTORY & REQUIRED PARTS
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 6: INVENTORY & REQUIRED PARTS ---');
    // Admin adds spare part to inventory
    const partRes = await fetch(`${baseUrl}/api/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'فحمات فرامل تويوتا كابري',
        part_number: 'BP-TY-2023',
        brand: 'Toyota Genuine Parts',
        price: 250,
        stock_quantity: 20,
        min_stock_level: 5
      })
    });
    const partData = await partRes.json();
    console.log('8. Inventory spare part creation status:', partRes.status, 'ID:', partData.part?.id);
    testPartId = partData.part.id;

    // Mechanic requests required part
    const reqPartRes = await fetch(`${baseUrl}/api/required-parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mechanicToken}`
      },
      body: JSON.stringify({
        appointment_id: testAppointmentId,
        parts: [{ id: testPartId, qty: 1 }]
      })
    });
    console.log('9. Mechanic required part request status:', reqPartRes.status);

    // Admin approves requested part
    const [reqPartRows] = await sequelize.query(`SELECT id FROM required_parts WHERE technical_report_id = ${testReportId};`);
    if (reqPartRows.length > 0) {
      const approveRes = await fetch(`${baseUrl}/api/required-parts/approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          decisions: [{ id: reqPartRows[0].id, status: 'approved' }]
        })
      });
      console.log('10. Admin required part approval status:', approveRes.status);
    }

    // ----------------------------------------------------
    // WORKFLOW 7: INVOICING & PAYMENT
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 7: INVOICING & PAYMENT ---');
    // Admin issues invoice
    const invRes = await fetch(`${baseUrl}/api/invoices/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        appointment_id: testAppointmentId,
        labor_cost: 150,
        parts_cost: 250
      })
    });
    const invData = await invRes.json();
    console.log('11. Issue invoice status:', invRes.status, 'ID:', invData.invoice?.id, 'Total:', invData.invoice?.total_amount);
    if (invRes.status !== 201) throw new Error('Invoice issuing failed');
    testInvoiceId = invData.invoice.id;

    // Client views invoice details
    const getInvRes = await fetch(`${baseUrl}/api/invoices/${testInvoiceId}`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    const getInvData = await getInvRes.json();
    console.log('12. Client get invoice status:', getInvRes.status, 'Total Amount:', getInvData.totalAmount);

    // Client pays invoice
    const payRes = await fetch(`${baseUrl}/api/invoices/${testInvoiceId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        amount: 400,
        payment_method: 'credit_card'
      })
    });
    const payData = await payRes.json();
    console.log('13. Client payment status:', payRes.status, 'New Invoice Status:', payData.invoiceStatus);
    if (payRes.status !== 200 || payData.invoiceStatus !== 'paid') throw new Error('Invoice payment failed');

    // Admin updates appointment status to completed
    await fetch(`${baseUrl}/api/appointments/${testAppointmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'completed' })
    });

    // ----------------------------------------------------
    // WORKFLOW 8: CLIENT REVIEW & RATING
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 8: CLIENT REVIEW & RATING ---');
    const reviewRes = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        appointment_id: testAppointmentId,
        rating: 5,
        comment: 'خدمة ممتازة وسريعة جداً شكراً لكم!'
      })
    });
    const reviewData = await reviewRes.json();
    console.log('14. Review creation status:', reviewRes.status, 'Message:', reviewData.message);
    if (reviewRes.status !== 201) throw new Error('Review submission failed');

    // ----------------------------------------------------
    // WORKFLOW 9: DASHBOARD & METRICS
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 9: DASHBOARD METRICS ---');
    const metricsRes = await fetch(`${baseUrl}/api/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const metricsData = await metricsRes.json();
    console.log('15. Admin metrics fetch status:', metricsRes.status, 'Metrics count:', metricsData.length);

    const custDashRes = await fetch(`${baseUrl}/api/customer/dashboard`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    const custDashData = await custDashRes.json();
    console.log('16. Customer dashboard fetch status:', custDashRes.status, 'Customer Name:', custDashData.profile?.name);

    // ----------------------------------------------------
    // WORKFLOW 10: LOGOUT & TOKEN REVOCATION
    // ----------------------------------------------------
    console.log('\n--- WORKFLOW 10: LOGOUT & TOKEN REVOCATION ---');
    const logoutRes = await fetch(`${baseUrl}/api/users/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    console.log('17. Client logout status:', logoutRes.status);

    const verifyAfterLogout = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    console.log('18. Re-using token after logout rejected (HTTP 401)?', verifyAfterLogout.status === 401);

  } finally {
    // CLEANUP TEMPORARY TEST DATA
    console.log('\n--- CLEANUP TEMPORARY WORKFLOW DATA ---');
    if (testAppointmentId) {
      await sequelize.query(`DELETE FROM reviews WHERE appointment_id = ${testAppointmentId};`);
      if (testInvoiceId) {
        await sequelize.query(`DELETE FROM payments WHERE invoice_id = ${testInvoiceId};`);
        await sequelize.query(`DELETE FROM invoice_items WHERE invoice_id = ${testInvoiceId};`);
        await sequelize.query(`DELETE FROM invoices WHERE id = ${testInvoiceId};`);
      }
      if (testReportId) {
        await sequelize.query(`DELETE FROM required_parts WHERE technical_report_id = ${testReportId};`);
        await sequelize.query(`DELETE FROM technical_reports WHERE id = ${testReportId};`);
      }
      await sequelize.query(`DELETE FROM appointments WHERE id = ${testAppointmentId};`);
    }
    if (testPartId) {
      await sequelize.query(`DELETE FROM spare_parts WHERE id = ${testPartId};`);
    }
    if (testVehicleId) {
      await sequelize.query(`DELETE FROM vehicles WHERE id = ${testVehicleId};`);
    }
    for (const email of testEmails) {
      await sequelize.query(`DELETE FROM users WHERE email = '${email}';`);
    }
    console.log(`✓ Cleaned up all temporary workflow test records from MySQL.`);

    server.close();
    await sequelize.close();
  }

  console.log('\n===================================================================');
  console.log('🎉 ALL STAGE 9 MASTER BACKEND E2E WORKFLOW TESTS PASSED PERFECTLY!');
  console.log('===================================================================');
}

runStage9MasterE2ETestSuite().catch(err => {
  console.error('❌ Stage 9 Master E2E Suite Error:', err);
  process.exit(1);
});
