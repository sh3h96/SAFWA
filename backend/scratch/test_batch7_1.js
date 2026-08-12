const http = require('http');
const { User, Vehicle, Appointment, TechnicalReport, Invoice, InvoiceItem, Payment, Review, RequiredPart, SparePart, sequelize } = require('../models');
const { Op } = require('sequelize');

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

async function runMasterE2ETests() {
  process.env.NODE_ENV = 'test';
  console.log('=== STEP 7.2 MASTER E2E GOLDEN THREAD EXECUTION ===\n');

  const app = require('../server');

  // Track created entity IDs for guaranteed cleanup
  const createdIds = {
    userIds: [],
    vehicleIds: [],
    appointmentIds: [],
    technicalReportIds: [],
    requiredPartIds: [],
    invoiceIds: [],
    paymentIds: [],
    reviewIds: []
  };

  // Pre-test cleanup to remove any stale test artifacts from aborted runs
  const prevTestUsers = await User.findAll({ where: { email: { [Op.like]: '%@test.com' } } });
  if (prevTestUsers.length > 0) {
    const prevUserIds = prevTestUsers.map(u => u.id);
    const prevVehicles = await Vehicle.findAll({ where: { client_id: { [Op.in]: prevUserIds } } });
    const prevVehIds = prevVehicles.map(v => v.id);
    const prevAppts = await Appointment.findAll({ where: { [Op.or]: [{ vehicle_id: { [Op.in]: prevVehIds } }, { client_id: { [Op.in]: prevUserIds } }, { mechanic_id: { [Op.in]: prevUserIds } }] } });
    const prevApptIds = prevAppts.map(a => a.id);

    if (prevApptIds.length > 0) {
      await Payment.destroy({ where: { invoice_id: { [Op.in]: (await Invoice.findAll({ where: { appointment_id: { [Op.in]: prevApptIds } } })).map(i => i.id) } } });
      await Invoice.destroy({ where: { appointment_id: { [Op.in]: prevApptIds } } });
      await Review.destroy({ where: { appointment_id: { [Op.in]: prevApptIds } } });
      const prevReports = await TechnicalReport.findAll({ where: { appointment_id: { [Op.in]: prevApptIds } } });
      const prevReportIds = prevReports.map(r => r.id);
      if (prevReportIds.length > 0) {
        await RequiredPart.destroy({ where: { technical_report_id: { [Op.in]: prevReportIds } } });
        await TechnicalReport.destroy({ where: { id: { [Op.in]: prevReportIds } } });
      }
      await Appointment.destroy({ where: { id: { [Op.in]: prevApptIds } } });
    }
    if (prevVehIds.length > 0) {
      await Vehicle.destroy({ where: { id: { [Op.in]: prevVehIds } } });
    }
    await User.destroy({ where: { id: { [Op.in]: prevUserIds } } });
  }

  try {
    // PREPARATION: Fetch or create active Receptionist, Mechanic A, Mechanic B, and Client B for multi-role workflow & security boundary checks
    console.log('--- Phase 0: Test Role Accounts Setup ---');
    let bcrypt;
    try {
      bcrypt = require('bcrypt');
    } catch (e) {
      try {
        bcrypt = require('bcryptjs');
      } catch (e2) {
        bcrypt = {
          hash: async (pwd) => pwd,
          compare: async (pwd, hash) => pwd === hash
        };
      }
    }
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Receptionist
    const recep = await User.create({
      name: 'E2E Receptionist',
      email: 'e2e_receptionist@test.com',
      phone: '0507778888',
      password: hashedPassword,
      role: 'receptionist',
      status: 'active'
    });
    createdIds.userIds.push(recep.id);

    // Create Mechanic A
    const mechA = await User.create({
      name: 'E2E Mechanic A',
      email: 'e2e_mechanica@test.com',
      phone: '0507778889',
      password: hashedPassword,
      role: 'mechanic',
      status: 'active'
    });
    createdIds.userIds.push(mechA.id);

    // Create Mechanic B
    const mechB = await User.create({
      name: 'E2E Mechanic B',
      email: 'e2e_mechanicb@test.com',
      phone: '0507778890',
      password: hashedPassword,
      role: 'mechanic',
      status: 'active'
    });
    createdIds.userIds.push(mechB.id);

    // Create Client B (for cross-owner security checks)
    const clientB = await User.create({
      name: 'E2E Client B',
      email: 'e2e_clientb@test.com',
      phone: '0507778891',
      password: hashedPassword,
      role: 'client',
      status: 'active'
    });
    createdIds.userIds.push(clientB.id);

    // Login Receptionist, Mechanic A, Mechanic B, Client B to get JWT tokens
    const recepLogin = await makeRequest(app, 'POST', '/api/auth/login', null, { email: recep.email, password: 'password123' });
    const recepToken = recepLogin.body.token;

    const mechALogin = await makeRequest(app, 'POST', '/api/auth/login', null, { email: mechA.email, password: 'password123' });
    const mechAToken = mechALogin.body.token;

    const mechBLogin = await makeRequest(app, 'POST', '/api/auth/login', null, { email: mechB.email, password: 'password123' });
    const mechBToken = mechBLogin.body.token;

    const clientBLogin = await makeRequest(app, 'POST', '/api/auth/login', null, { email: clientB.email, password: 'password123' });
    const clientBToken = clientBLogin.body.token;

    console.log('✔ Phase 0 Complete: Role tokens acquired (Receptionist, Mechanic A, Mechanic B, Client B)\n');

    // =========================================================================
    // STEP 1: Register Client A
    // =========================================================================
    console.log('--- Step 1: Client Registration ---');
    const clientAReg = await makeRequest(app, 'POST', '/api/auth/register', null, {
      fullName: 'E2E Client A',
      email: 'e2e_clienta@test.com',
      phone: '0507779999',
      password: 'password123'
    });
    if (clientAReg.statusCode !== 201 || !clientAReg.body.token) {
      throw new Error(`Step 1 Failed: Expected 201 Created with token, got status ${clientAReg.statusCode}`);
    }
    const clientAToken = clientAReg.body.token;
    const clientAId = clientAReg.body.user.id;
    createdIds.userIds.push(clientAId);
    console.log(`✔ Step 1 PASSED: Client A registered successfully (ID: ${clientAId})`);

    // =========================================================================
    // STEP 2: Client A Adds Vehicle
    // =========================================================================
    console.log('\n--- Step 2: Vehicle Creation ---');
    const vehRes = await makeRequest(app, 'POST', '/api/vehicles', clientAToken, {
      make: 'Lexus',
      model: 'LS500',
      year: 2023,
      license_plate: 'E2E-777',
      vin: 'VIN7778889990001',
      color: 'Black'
    });
    const createdVeh = vehRes.body.vehicle || vehRes.body;
    if (vehRes.statusCode !== 201 || !createdVeh || !createdVeh.id) {
      throw new Error(`Step 2 Failed: Expected 201 Created for vehicle, got ${vehRes.statusCode}`);
    }
    const vehicleId = createdVeh.id;
    createdIds.vehicleIds.push(vehicleId);
    console.log(`✔ Step 2 PASSED: Vehicle created successfully (ID: ${vehicleId}, Plate: E2E-777)`);

    // Security Check: Client B cannot view Client A's vehicle history
    const crossVehCheck = await makeRequest(app, 'GET', `/api/vehicles/${vehicleId}/history`, clientBToken);
    if (crossVehCheck.statusCode !== 404) {
      throw new Error(`Security Check Failed: Expected 404 for cross-client vehicle history, got ${crossVehCheck.statusCode}`);
    }
    console.log('✔ Security Check PASSED: Client B access to Client A vehicle history blocked (HTTP 404)');

    // =========================================================================
    // STEP 3: Client A Books Appointment
    // =========================================================================
    console.log('\n--- Step 3: Appointment Booking ---');
    const apptRes = await makeRequest(app, 'POST', '/api/appointments', clientAToken, {
      vehicle_id: vehicleId,
      scheduled_date: '2026-08-20',
      problem_description: 'E2E Golden Thread Transmission Slipping and Noise',
      notes: 'Please check gearbox oil'
    });
    const createdAppt = apptRes.body.appointment || apptRes.body;
    if (apptRes.statusCode !== 201 || !createdAppt || !createdAppt.id) {
      throw new Error(`Step 3 Failed: Expected 201 Created for appointment, got ${apptRes.statusCode}`);
    }
    const apptId = createdAppt.id;
    createdIds.appointmentIds.push(apptId);
    console.log(`✔ Step 3 PASSED: Appointment booked successfully (ID: ${apptId})`);

    // Security Check: Client B cannot view Client A's appointment
    const crossApptCheck = await makeRequest(app, 'GET', `/api/appointments/${apptId}`, clientBToken);
    if (crossApptCheck.statusCode !== 404) {
      throw new Error(`Security Check Failed: Expected 404 for cross-client appointment view, got ${crossApptCheck.statusCode}`);
    }
    console.log('✔ Security Check PASSED: Client B access to Client A appointment blocked (HTTP 404)');

    // =========================================================================
    // STEP 4: Receptionist Assigns Mechanic A
    // =========================================================================
    console.log('\n--- Step 4: Receptionist Mechanic Assignment ---');
    const assignRes = await makeRequest(app, 'PUT', `/api/appointments/${apptId}`, recepToken, {
      mechanic_id: mechA.id
    });
    if (assignRes.statusCode !== 200) {
      throw new Error(`Step 4 Failed: Receptionist assignment returned ${assignRes.statusCode}`);
    }
    console.log(`✔ Step 4 PASSED: Receptionist assigned Mechanic A (ID: ${mechA.id}) to Appointment ${apptId}`);

    // Security Check: Mechanic B cannot access appointment assigned to Mechanic A
    const mechBCheck = await makeRequest(app, 'GET', `/api/appointments/${apptId}`, mechBToken);
    if (mechBCheck.statusCode !== 404) {
      throw new Error(`Security Check Failed: Expected 404 for unassigned Mechanic B, got ${mechBCheck.statusCode}`);
    }
    console.log('✔ Security Check PASSED: Unassigned Mechanic B access blocked (HTTP 404)');

    // =========================================================================
    // STEP 5: Mechanic A Inspects & Creates Technical Report
    // =========================================================================
    console.log('\n--- Step 5: Technical Report Submission ---');
    const reportRes = await makeRequest(app, 'POST', '/api/reports', mechAToken, {
      appointment_id: apptId,
      diagnostics: 'Transmission solenoid valve defect detected during inspection',
      labor_hours: 3
    });
    const createdReport = reportRes.body.report || reportRes.body;
    if (reportRes.statusCode !== 201 || !createdReport || !createdReport.id) {
      throw new Error(`Step 5 Failed: Expected 201 Created for technical report, got ${reportRes.statusCode}`);
    }
    const reportId = createdReport.id;
    createdIds.technicalReportIds.push(reportId);
    console.log(`✔ Step 5 PASSED: Technical Report created successfully (ID: ${reportId})`);

    // =========================================================================
    // STEP 6: Mechanic A Requests Required Parts
    // =========================================================================
    console.log('\n--- Step 6: Required Spare Parts Request ---');
    const sparePart = await SparePart.findByPk(1) || await SparePart.findOne();
    const partId = sparePart ? sparePart.id : 1;

    const partsReqRes = await makeRequest(app, 'POST', '/api/required-parts', mechAToken, {
      appointment_id: apptId,
      parts: [{ id: partId, qty: 1 }]
    });
    if (partsReqRes.statusCode !== 201) {
      throw new Error(`Step 6 Failed: Expected 201 Created for parts request, got ${partsReqRes.statusCode}`);
    }

    const reqPartsCreated = await RequiredPart.findAll({ where: { technical_report_id: reportId } });
    reqPartsCreated.forEach(rp => createdIds.requiredPartIds.push(rp.id));
    console.log(`✔ Step 6 PASSED: Required Part requested (Count: ${reqPartsCreated.length}, Technical Report ID: ${reportId})`);

    // =========================================================================
    // STEP 7: Receptionist Approves Required Parts
    // =========================================================================
    console.log('\n--- Step 7: Receptionist Parts Approval ---');
    const reqPartIdToApprove = reqPartsCreated[0].id;
    const approvalRes = await makeRequest(app, 'PUT', '/api/required-parts/approval', recepToken, {
      decisions: [{ id: reqPartIdToApprove, status: 'approved' }]
    });
    if (approvalRes.statusCode !== 200) {
      throw new Error(`Step 7 Failed: Expected 200 OK for parts approval, got ${approvalRes.statusCode}`);
    }
    console.log(`✔ Step 7 PASSED: Receptionist approved Required Part ID ${reqPartIdToApprove}`);

    // =========================================================================
    // STEP 8: Mechanic A Hardening Check & Repair Completion
    // =========================================================================
    console.log('\n--- Step 8: Mechanic Repair Completion & Hardening Verification ---');
    
    // Hardening Security Check: Mechanic A attempting to change mechanic_id must fail with 400
    const mechBypass = await makeRequest(app, 'PUT', `/api/appointments/${apptId}`, mechAToken, {
      status: 'completed',
      mechanic_id: mechB.id
    });
    if (mechBypass.statusCode !== 400) {
      throw new Error(`Mechanic Hardening Check Failed: Expected 400 for mechanic_id change attempt, got ${mechBypass.statusCode}`);
    }
    console.log('✔ Hardening Check PASSED: Mechanic attempt to alter mechanic_id rejected (HTTP 400)');

    // Mechanic completes repair by updating ONLY status field
    const completeRes = await makeRequest(app, 'PUT', `/api/appointments/${apptId}`, mechAToken, {
      status: 'completed'
    });
    if (completeRes.statusCode !== 200) {
      throw new Error(`Step 8 Failed: Expected 200 OK for mechanic status update to completed, got ${completeRes.statusCode}`);
    }
    console.log(`✔ Step 8 PASSED: Mechanic A updated appointment status to "completed"`);

    // =========================================================================
    // STEP 9: Receptionist Issues Dynamic Invoice
    // =========================================================================
    console.log('\n--- Step 9: Dynamic Invoice Issuance ---');
    const invoiceRes = await makeRequest(app, 'POST', '/api/invoices/issue', recepToken, {
      appointment_id: apptId,
      labor_cost: 300,
      parts_cost: 200
    });
    if (invoiceRes.statusCode !== 201 || !invoiceRes.body.invoice) {
      throw new Error(`Step 9 Failed: Expected 201 Created for invoice, got ${invoiceRes.statusCode}`);
    }
    const invoiceId = invoiceRes.body.invoice.id;
    const totalAmount = parseFloat(invoiceRes.body.invoice.total_amount);
    createdIds.invoiceIds.push(invoiceId);
    console.log(`✔ Step 9 PASSED: Invoice issued successfully (Invoice ID: ${invoiceId}, Total: ${totalAmount} SAR)`);

    // =========================================================================
    // STEP 10: Client A Views & Pays Invoice in Full
    // =========================================================================
    console.log('\n--- Step 10: Client Invoice Payment ---');

    // Security Check: Client B attempting to pay Client A's invoice must return 404
    const crossPayCheck = await makeRequest(app, 'POST', `/api/invoices/${invoiceId}/pay`, clientBToken, {
      amount: totalAmount
    });
    if (crossPayCheck.statusCode !== 404) {
      throw new Error(`Security Check Failed: Expected 404 for cross-client invoice payment, got ${crossPayCheck.statusCode}`);
    }
    console.log('✔ Security Check PASSED: Client B payment on Client A invoice blocked (HTTP 404)');

    // Client A views own invoice
    const getInvRes = await makeRequest(app, 'GET', `/api/invoices/${invoiceId}`, clientAToken);
    if (getInvRes.statusCode !== 200 || !getInvRes.body.invoiceId) {
      throw new Error(`Step 10 Failed: Expected 200 OK for client invoice lookup, got ${getInvRes.statusCode}`);
    }
    console.log(`✔ Client A fetched invoice details: status=${getInvRes.body.status}, total=${getInvRes.body.totalAmount} SAR`);

    // Client A pays invoice in full
    const payRes = await makeRequest(app, 'POST', `/api/invoices/${invoiceId}/pay`, clientAToken, {
      amount: totalAmount,
      payment_method: 'credit_card'
    });
    if (payRes.statusCode !== 200 || !payRes.body.invoiceStatus) {
      throw new Error(`Step 10 Failed: Expected 200 OK for full invoice payment, got ${payRes.statusCode}`);
    }
    if (payRes.body.invoiceStatus !== 'paid') {
      throw new Error(`Step 10 Failed: Invoice status expected 'paid', got '${payRes.body.invoiceStatus}'`);
    }

    // Track payment ID created
    const createdPayments = await Payment.findAll({ where: { invoice_id: invoiceId } });
    createdPayments.forEach(p => createdIds.paymentIds.push(p.id));
    console.log(`✔ Step 10 PASSED: Client A paid ${totalAmount} SAR. Invoice status updated to "paid"`);

    // =========================================================================
    // STEP 11: Client A Submits Service Review
    // =========================================================================
    console.log('\n--- Step 11: Service Review Submission ---');
    const reviewRes = await makeRequest(app, 'POST', '/api/reviews', clientAToken, {
      appointment_id: apptId,
      rating: 5,
      comment: 'E2E Golden Thread Test: Excellent repair and fast turn-around!'
    });
    if (reviewRes.statusCode !== 201 || !reviewRes.body.review) {
      throw new Error(`Step 11 Failed: Expected 201 Created for review submission, got ${reviewRes.statusCode}`);
    }
    const reviewId = reviewRes.body.review.id;
    createdIds.reviewIds.push(reviewId);
    console.log(`✔ Step 11 PASSED: Review submitted successfully (ID: ${reviewId}, Rating: 5/5)`);

    // Duplicate Review Security Check: Second review for same appointment must fail with 400
    const dupReview = await makeRequest(app, 'POST', '/api/reviews', clientAToken, {
      appointment_id: apptId,
      rating: 4,
      comment: 'Duplicate review attempt'
    });
    if (dupReview.statusCode !== 400) {
      throw new Error(`Security Check Failed: Expected 400 for duplicate review, got ${dupReview.statusCode}`);
    }
    console.log('✔ Security Check PASSED: Duplicate review attempt blocked (HTTP 400)');

    console.log('\n=== MASTER E2E GOLDEN THREAD PASSED 100% SUCCESSFULLY! ===\n');

  } finally {
    // =========================================================================
    // GUARANTEED TEARDOWN & CLEANUP (STRICT FK DEPENDENCY ORDER)
    // =========================================================================
    console.log('--- Phase 12: Guaranteed Database Teardown & Teardown Verification ---');
    try {
      // 1. Delete Payments
      if (createdIds.invoiceIds.length > 0) {
        await Payment.destroy({ where: { invoice_id: { [Op.in]: createdIds.invoiceIds } } });
      }
      // 2. Delete Invoice Items
      if (createdIds.invoiceIds.length > 0) {
        await InvoiceItem.destroy({ where: { invoice_id: { [Op.in]: createdIds.invoiceIds } } });
      }
      // 3. Delete Invoices
      if (createdIds.invoiceIds.length > 0) {
        await Invoice.destroy({ where: { id: { [Op.in]: createdIds.invoiceIds } } });
      }
      // 4. Delete Reviews
      if (createdIds.reviewIds.length > 0) {
        await Review.destroy({ where: { id: { [Op.in]: createdIds.reviewIds } } });
      }
      // 5. Delete Required Parts
      if (createdIds.technicalReportIds.length > 0) {
        await RequiredPart.destroy({ where: { technical_report_id: { [Op.in]: createdIds.technicalReportIds } } });
      }
      // 6. Delete Technical Reports
      if (createdIds.appointmentIds.length > 0) {
        await TechnicalReport.destroy({ where: { appointment_id: { [Op.in]: createdIds.appointmentIds } } });
      }
      // 7. Delete Appointments
      if (createdIds.appointmentIds.length > 0) {
        await Appointment.destroy({ where: { id: { [Op.in]: createdIds.appointmentIds } } });
      }
      // 8. Delete Vehicles created during test run OR owned by test users
      if (createdIds.vehicleIds.length > 0 || createdIds.userIds.length > 0) {
        const vehWhere = createdIds.vehicleIds.length > 0 
          ? { [Op.or]: [{ id: { [Op.in]: createdIds.vehicleIds } }, { client_id: { [Op.in]: createdIds.userIds } }] }
          : { client_id: { [Op.in]: createdIds.userIds } };
        await Vehicle.destroy({ where: vehWhere });
      }
      // 9. Delete Users
      if (createdIds.userIds.length > 0) {
        await User.destroy({ where: { id: { [Op.in]: createdIds.userIds } } });
      }
      console.log('✔ Teardown Complete: All test-created records deleted successfully');
    } catch (cleanupErr) {
      console.error('✖ Error during database teardown:', cleanupErr);
    }
  }

  // =========================================================================
  // ZERO-RESIDUE DATABASE VERIFICATION (9 MODELS)
  // =========================================================================
  console.log('\n--- Phase 13: Zero-Residue Direct Database Check (9 Models) ---');
  const testUsers = await User.count({ where: { [Op.or]: [{ email: { [Op.like]: '%@test.com' } }, { email: { [Op.like]: '%_b%' } }, { name: { [Op.like]: '%E2E%' } }, { name: { [Op.like]: '%Test%' } }] } });
  const testVehicles = await Vehicle.count({ where: { [Op.or]: [{ license_plate: { [Op.like]: '%E2E%' } }, { license_plate: { [Op.like]: '%B5%' } }, { license_plate: { [Op.like]: '%B4%' } }, { license_plate: { [Op.like]: '%B3%' } }, { license_plate: { [Op.like]: '%TEST%' } }] } });
  const testAppts = await Appointment.count({ where: { problem_description: { [Op.like]: '%E2E%' } } });
  const testReports = await TechnicalReport.count({ where: { diagnostics: { [Op.like]: '%Transmission solenoid%' } } });
  const testInvoices = await Invoice.count({ where: { id: { [Op.gt]: 30 } } });
  const testInvoiceItems = await InvoiceItem.count({ where: { invoice_id: { [Op.gt]: 30 } } });
  const testPayments = await Payment.count({ where: { invoice_id: { [Op.gt]: 30 } } });
  const testReviews = await Review.count({ where: { comment: { [Op.like]: '%E2E%' } } });
  const testRequiredParts = await RequiredPart.count({ where: { technical_report_id: { [Op.gt]: 50 } } });

  console.log('Users remaining:', testUsers);
  console.log('Vehicles remaining:', testVehicles);
  console.log('Appointments remaining:', testAppts);
  console.log('Technical Reports remaining:', testReports);
  console.log('Invoices remaining:', testInvoices);
  console.log('Invoice Items remaining:', testInvoiceItems);
  console.log('Payments remaining:', testPayments);
  console.log('Reviews remaining:', testReviews);
  console.log('Required Parts remaining:', testRequiredParts);

  if (testUsers + testVehicles + testAppts + testReports + testInvoices + testInvoiceItems + testPayments + testReviews + testRequiredParts > 0) {
    throw new Error('Zero-Residue Check Failed: Residual test records found in database!');
  }
  console.log('✔ Zero-Residue Direct DB Check PASSED: 0 residual records across all 9 models!');
}

runMasterE2ETests().catch(err => {
  console.error('\n✖ MASTER E2E TEST FAILED:', err);
  process.exit(1);
});
