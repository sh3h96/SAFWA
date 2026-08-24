'use strict';

const { User, Vehicle, Appointment, Invoice, Payment, InvoiceItem, AuditLog, sequelize } = require('./models');
const invoiceController = require('./controllers/invoiceController');

function createResMock() {
  return {
    statusCode: 200,
    responseData: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; }
  };
}

let testAdmin, testSuperAdmin, testMechanic, testClientA, testClientB;
let testVehicleA, testVehicleB, testApptA, testApptB;
let testInvoiceA, testInvoiceB;

const createdUserIds = [];
const createdVehicleIds = [];
const createdAppointmentIds = [];
const createdInvoiceIds = [];

async function setupTestData() {
  console.log('--- SETTING UP TASK 11 TEST DATA ---');
  const ts = Date.now();

  testSuperAdmin = await User.create({
    name: `T11 SuperAdmin ${ts}`,
    email: `t11_superadmin_${ts}@safwa.test`,
    password: 'hashedpassword',
    role: 'super_admin',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testSuperAdmin.id);

  testAdmin = await User.create({
    name: `T11 Admin ${ts}`,
    email: `t11_admin_${ts}@safwa.test`,
    password: 'hashedpassword',
    role: 'admin',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testAdmin.id);

  testMechanic = await User.create({
    name: `T11 Mechanic ${ts}`,
    email: `t11_mechanic_${ts}@safwa.test`,
    password: 'hashedpassword',
    role: 'mechanic',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testMechanic.id);

  testClientA = await User.create({
    name: `T11 Client A ${ts}`,
    email: `t11_clienta_${ts}@safwa.test`,
    password: 'hashedpassword',
    role: 'client',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testClientA.id);

  testClientB = await User.create({
    name: `T11 Client B ${ts}`,
    email: `t11_clientb_${ts}@safwa.test`,
    password: 'hashedpassword',
    role: 'client',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testClientB.id);

  testVehicleA = await Vehicle.create({
    client_id: testClientA.id,
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    license_plate: `T11-A-${ts}`
  });
  createdVehicleIds.push(testVehicleA.id);

  testVehicleB = await Vehicle.create({
    client_id: testClientB.id,
    make: 'Honda',
    model: 'Accord',
    year: 2021,
    license_plate: `T11-B-${ts}`
  });
  createdVehicleIds.push(testVehicleB.id);

  testApptA = await Appointment.create({
    client_id: testClientA.id,
    vehicle_id: testVehicleA.id,
    problem_description: 'Engine Noise Diagnostic Test 11 A',
    status: 'completed',
    scheduled_date: new Date()
  });
  createdAppointmentIds.push(testApptA.id);

  testApptB = await Appointment.create({
    client_id: testClientB.id,
    vehicle_id: testVehicleB.id,
    problem_description: 'Brake Inspection Test 11 B',
    status: 'completed',
    scheduled_date: new Date()
  });
  createdAppointmentIds.push(testApptB.id);
}

async function cleanupTestData() {
  console.log('--- CLEANING UP TASK 11 TEST DATA ---');
  try {
    if (createdInvoiceIds.length > 0) {
      await Payment.destroy({ where: { invoice_id: createdInvoiceIds } });
      await InvoiceItem.destroy({ where: { invoice_id: createdInvoiceIds } });
      await Invoice.destroy({ where: { id: createdInvoiceIds } });
    }

    if (createdAppointmentIds.length > 0) {
      await Appointment.destroy({ where: { id: createdAppointmentIds } });
    }

    if (createdVehicleIds.length > 0) {
      await Vehicle.destroy({ where: { id: createdVehicleIds } });
    }

    if (createdUserIds.length > 0) {
      await User.destroy({ where: { id: createdUserIds } });
    }

    console.log('✓ Cleanup completed: Database state pristine');
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

async function runTests() {
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASSED: ${message}`);
      passedCount++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failedCount++;
    }
  }

  try {
    await setupTestData();

    console.log('\n=== SAFWA TASK 11 VERIFICATION TESTS ===\n');

    // 1. Admin can issue an invoice
    {
      const req = {
        user: { id: testAdmin.id, role: 'admin' },
        body: { appointment_id: testApptA.id, labor_cost: 200, parts_cost: 300 }
      };
      const res = createResMock();
      await invoiceController.issueInvoice(req, res);
      assert(res.statusCode === 201 && res.responseData.invoice, 'Admin can issue an invoice (201 Created)');
      testInvoiceA = res.responseData.invoice;
      createdInvoiceIds.push(testInvoiceA.id);
    }

    // 2. Super Admin can issue an invoice
    {
      const req = {
        user: { id: testSuperAdmin.id, role: 'super_admin' },
        body: { appointment_id: testApptB.id, labor_cost: 150, parts_cost: 250 }
      };
      const res = createResMock();
      await invoiceController.issueInvoice(req, res);
      assert(res.statusCode === 201 && res.responseData.invoice, 'Super Admin can issue an invoice (201 Created)');
      testInvoiceB = res.responseData.invoice;
      createdInvoiceIds.push(testInvoiceB.id);
    }

    // 3. Duplicate invoice for same appointment is rejected (400)
    {
      const req = {
        user: { id: testAdmin.id, role: 'admin' },
        body: { appointment_id: testApptA.id, labor_cost: 100 }
      };
      const res = createResMock();
      await invoiceController.issueInvoice(req, res);
      assert(res.statusCode === 400, 'Duplicate invoice creation for same appointment is rejected (400 Bad Request)');
    }

    // 4. Client can retrieve own invoice
    {
      const req = {
        user: { id: testClientA.id, role: 'client' },
        params: { id: String(testInvoiceA.id) }
      };
      const res = createResMock();
      await invoiceController.getInvoice(req, res);
      assert(res.statusCode === 200 && res.responseData.invoiceId === testInvoiceA.id, 'Client A can retrieve own invoice');
    }

    // 5. Client cannot retrieve another client's invoice (404 Data Isolation)
    {
      const req = {
        user: { id: testClientB.id, role: 'client' },
        params: { id: String(testInvoiceA.id) }
      };
      const res = createResMock();
      await invoiceController.getInvoice(req, res);
      assert(res.statusCode === 404, 'Client B cannot retrieve Client A invoice (404 Data Isolation)');
    }

    // 6. Client getMyInvoices returns only own invoices
    {
      const req = {
        user: { id: testClientA.id, role: 'client' }
      };
      const res = createResMock();
      await invoiceController.getMyInvoices(req, res);
      assert(res.statusCode === 200 && Array.isArray(res.responseData) && res.responseData.length === 1, 'getMyInvoices returns only Client A invoices');
    }

    // 7. Partial Payment updates paid amount & status -> partially_paid
    {
      const req = {
        user: { id: testClientA.id, role: 'client' },
        params: { id: String(testInvoiceA.id) },
        body: { amount: 200, payment_method: 'credit_card' }
      };
      const res = createResMock();
      await invoiceController.payInvoice(req, res);
      assert(res.statusCode === 200 && res.responseData.invoiceStatus === 'partially_paid', 'Partial payment results in partially_paid status');
      assert(res.responseData.totalPaid === 200 && res.responseData.remainingBalance === 300, 'Remaining balance is recalculated correctly (500 - 200 = 300)');
    }

    // 8. Negative payment is rejected (400)
    {
      const req = {
        user: { id: testClientA.id, role: 'client' },
        params: { id: String(testInvoiceA.id) },
        body: { amount: -50 }
      };
      const res = createResMock();
      await invoiceController.payInvoice(req, res);
      assert(res.statusCode === 400, 'Negative payment rejected with 400 Bad Request');
    }

    // 9. Invalid payment amount is rejected (400)
    {
      const req = {
        user: { id: testClientA.id, role: 'client' },
        params: { id: String(testInvoiceA.id) },
        body: { amount: "invalid_num" }
      };
      const res = createResMock();
      await invoiceController.payInvoice(req, res);
      assert(res.statusCode === 400, 'Invalid payment amount rejected with 400 Bad Request');
    }

    // 10. Overpayment is rejected (400)
    {
      const req = {
        user: { id: testClientA.id, role: 'client' },
        params: { id: String(testInvoiceA.id) },
        body: { amount: 500 } // Remaining balance is 300
      };
      const res = createResMock();
      await invoiceController.payInvoice(req, res);
      assert(res.statusCode === 400, 'Overpayment rejected with 400 Bad Request');
    }

    // 11. Finalizing payment updates status -> paid
    {
      const req = {
        user: { id: testClientA.id, role: 'client' },
        params: { id: String(testInvoiceA.id) },
        body: { amount: 300 }
      };
      const res = createResMock();
      await invoiceController.payInvoice(req, res);
      assert(res.statusCode === 200 && res.responseData.invoiceStatus === 'paid', 'Full payment results in paid status');
      assert(res.responseData.totalPaid === 500 && res.responseData.remainingBalance === 0, 'Remaining balance becomes 0 when fully paid');
    }

    // 12. Payment on fully paid invoice rejected (400)
    {
      const req = {
        user: { id: testClientA.id, role: 'client' },
        params: { id: String(testInvoiceA.id) },
        body: { amount: 50 }
      };
      const res = createResMock();
      await invoiceController.payInvoice(req, res);
      assert(res.statusCode === 400, 'Payment on fully paid invoice rejected (400 Bad Request)');
    }

    // 13. Audit Log verification for INVOICE_ISSUED
    {
      const auditIssued = await AuditLog.findOne({
        where: { action: 'INVOICE_ISSUED', entity_id: String(testInvoiceA.id) }
      });
      assert(auditIssued && Number(auditIssued.actor_user_id) === Number(testAdmin.id), 'INVOICE_ISSUED audit log created with correct actor_user_id');
    }

    // 14. Audit Log verification for PAYMENT_RECORDED
    {
      const auditPaid = await AuditLog.findOne({
        where: { action: 'PAYMENT_RECORDED', entity_id: String(testInvoiceA.id) }
      });
      assert(auditPaid && Number(auditPaid.actor_user_id) === Number(testClientA.id), 'PAYMENT_RECORDED audit log created with correct client actor_user_id');
    }

    // 15. Audit logs do NOT contain sensitive keys
    {
      const sampleAudit = await AuditLog.findOne({ where: { entity_id: String(testInvoiceA.id) } });
      const strVal = JSON.stringify(sampleAudit);
      const containsSecret = strVal.includes('password_hash') || strVal.includes('jwt_secret');
      assert(!containsSecret, 'Audit log snapshot contains zero passwords or sensitive credentials');
    }

    // 16. Financial Reports contain real database values
    {
      const req = {
        user: { id: testAdmin.id, role: 'admin' },
        query: {}
      };
      const res = createResMock();
      await invoiceController.getPendingReports(req, res);
      assert(res.statusCode === 200 && Array.isArray(res.responseData), 'Admin can fetch financial reports (200 OK)');
      const foundA = res.responseData.find(r => r.appointment_id === testApptA.id);
      assert(foundA && foundA.amount === 500 && foundA.status === 'invoiced', 'Report contains calculated invoice total amount');
    }

  } catch (globalErr) {
    console.error('Global verification test error:', globalErr);
  } finally {
    await cleanupTestData();

    console.log('\n======================================');
    console.log(`TASK 11 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================\n');
    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

runTests();
