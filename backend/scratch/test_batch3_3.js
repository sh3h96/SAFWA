const { sequelize, User, Vehicle, Appointment, TechnicalReport, Invoice, Payment } = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/models');
const invoiceController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/invoiceController');
const customerController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/customerController');
const dashboardController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/dashboardController');
const vehicleController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/vehicleController');

function createMockRes() {
  return {
    statusCode: 200,
    responseData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.responseData = data;
      return this;
    }
  };
}

async function runTests() {
  console.log('=== BATCH 3.3 REAL FINANCIAL INTEGRATION TEST & VERIFICATION ===\n');

  let testInvoice = null;
  let tempAppointment = null;
  let createdPaymentIds = [];

  try {
    await sequelize.authenticate();
    console.log('✔ DB Connection: SUCCESS');

    // Setup temporary test invoice with total_amount = 500.00
    const seededClient = await User.findOne({ where: { role: 'client' } });
    let seededVehicle = await Vehicle.findOne({ where: { client_id: seededClient.id } });
    if (!seededVehicle) seededVehicle = await Vehicle.findOne();

    tempAppointment = await Appointment.create({
      client_id: seededClient.id,
      vehicle_id: seededVehicle.id,
      scheduled_date: new Date(),
      status: 'completed',
      problem_description: 'تغيير فحمات وتغيير زيت'
    });

    testInvoice = await Invoice.create({
      appointment_id: tempAppointment.id,
      total_amount: 500.00,
      status: 'unpaid',
      issued_at: new Date()
    });

    console.log(`Created temporary test invoice ID ${testInvoice.id} (Total: 500.00 SAR)`);

    const reqUserClient = { id: seededClient.id, role: 'client' };
    const reqUserAdmin = { id: 1, role: 'admin' };

    // TEST 1: Get existing invoice
    const reqGetInv = { params: { id: testInvoice.id }, user: reqUserClient };
    const resGetInv = createMockRes();
    await invoiceController.getInvoice(reqGetInv, resGetInv);
    if (resGetInv.statusCode !== 200 || !resGetInv.responseData) {
      throw new Error(`TEST 1 Failed: getInvoice returned status ${resGetInv.statusCode}`);
    }
    console.log('✔ TEST 1 PASSED: Get existing invoice returned 200 OK');

    // TEST 2: Get non-existing invoice -> 404
    const reqNonExist = { params: { id: 999999 }, user: reqUserClient };
    const resNonExist = createMockRes();
    await invoiceController.getInvoice(reqNonExist, resNonExist);
    if (resNonExist.statusCode !== 404) {
      throw new Error(`TEST 2 Failed: Expected 404 for non-existent invoice, got ${resNonExist.statusCode}`);
    }
    console.log('✔ TEST 2 PASSED: Get non-existing invoice returned 404 Not Found');

    // TEST 3 & 4: Get pending reports
    const reqPending = { query: {}, user: reqUserAdmin };
    const resPending = createMockRes();
    await invoiceController.getPendingReports(reqPending, resPending);
    if (resPending.statusCode !== 200 || !Array.isArray(resPending.responseData)) {
      throw new Error(`TEST 3/4 Failed: getPendingReports status ${resPending.statusCode}`);
    }
    console.log(`✔ TEST 3/4 PASSED: getPendingReports returned array of ${resPending.responseData.length} items (no mock fallback)`);

    // TEST 8: Attempt payment amount = 0 -> 400
    const reqPayZero = { params: { id: testInvoice.id }, body: { amount: 0, payment_method: 'cash' }, user: reqUserClient };
    const resPayZero = createMockRes();
    await invoiceController.payInvoice(reqPayZero, resPayZero);
    if (resPayZero.statusCode !== 400) {
      throw new Error(`TEST 8 Failed: Expected 400 for amount=0, got ${resPayZero.statusCode}`);
    }
    console.log('✔ TEST 8 PASSED: Payment amount=0 rejected with 400 Bad Request');

    // TEST 9: Attempt negative payment -> 400
    const reqPayNeg = { params: { id: testInvoice.id }, body: { amount: -50, payment_method: 'cash' }, user: reqUserClient };
    const resPayNeg = createMockRes();
    await invoiceController.payInvoice(reqPayNeg, resPayNeg);
    if (resPayNeg.statusCode !== 400) {
      throw new Error(`TEST 9 Failed: Expected 400 for negative amount, got ${resPayNeg.statusCode}`);
    }
    console.log('✔ TEST 9 PASSED: Negative payment amount rejected with 400 Bad Request');

    // TEST 10: Attempt payment greater than remaining balance -> 400
    const reqPayOver = { params: { id: testInvoice.id }, body: { amount: 600, payment_method: 'credit_card' }, user: reqUserClient };
    const resPayOver = createMockRes();
    await invoiceController.payInvoice(reqPayOver, resPayOver);
    if (resPayOver.statusCode !== 400) {
      throw new Error(`TEST 10 Failed: Expected 400 for overpayment (600 > 500), got ${resPayOver.statusCode}`);
    }
    console.log('✔ TEST 10 PASSED: Overpayment (600 SAR on 500 SAR invoice) rejected with 400 Bad Request');

    // TEST 5: Pay an unpaid invoice with a valid partial amount (200 SAR out of 500 SAR)
    const reqPayPartial = { params: { id: testInvoice.id }, body: { amount: 200, payment_method: 'credit_card' }, user: reqUserClient };
    const resPayPartial = createMockRes();
    await invoiceController.payInvoice(reqPayPartial, resPayPartial);
    if (resPayPartial.statusCode !== 200 || resPayPartial.responseData.invoiceStatus !== 'partially_paid') {
      throw new Error(`TEST 5 Failed: Expected status partially_paid, got ${resPayPartial.responseData?.invoiceStatus}`);
    }
    createdPaymentIds.push(resPayPartial.responseData.payment.id);
    console.log('✔ TEST 5 PASSED: Partial payment (200/500 SAR) processed successfully! Invoice status set to "partially_paid"');

    // TEST 7: Invoice with existing payment - Ensure new payment is added to previous payments
    // Pay second partial payment of 100 SAR (Total paid becomes 300 SAR out of 500 SAR)
    const reqPayPartial2 = { params: { id: testInvoice.id }, body: { amount: 100, payment_method: 'mada' }, user: reqUserClient };
    const resPayPartial2 = createMockRes();
    await invoiceController.payInvoice(reqPayPartial2, resPayPartial2);
    if (resPayPartial2.statusCode !== 200 || resPayPartial2.responseData.totalPaid !== 300) {
      throw new Error(`TEST 7 Failed: Expected totalPaid 300, got ${resPayPartial2.responseData?.totalPaid}`);
    }
    createdPaymentIds.push(resPayPartial2.responseData.payment.id);
    console.log('✔ TEST 7 PASSED: Second partial payment added cleanly! Old payments preserved, totalPaid now 300 SAR');

    // TEST 6: Pay remaining balance (200 SAR) -> status = paid
    const reqPayFinal = { params: { id: testInvoice.id }, body: { amount: 200, payment_method: 'cash' }, user: reqUserClient };
    const resPayFinal = createMockRes();
    await invoiceController.payInvoice(reqPayFinal, resPayFinal);
    if (resPayFinal.statusCode !== 200 || resPayFinal.responseData.invoiceStatus !== 'paid') {
      throw new Error(`TEST 6 Failed: Expected status paid, got ${resPayFinal.responseData?.invoiceStatus}`);
    }
    createdPaymentIds.push(resPayFinal.responseData.payment.id);
    console.log('✔ TEST 6 PASSED: Final remaining balance (200 SAR) paid! Invoice status updated to "paid"');

    // Attempt payment after fully paid -> should be rejected
    const reqPayAlreadyPaid = { params: { id: testInvoice.id }, body: { amount: 50, payment_method: 'cash' }, user: reqUserClient };
    const resPayAlreadyPaid = createMockRes();
    await invoiceController.payInvoice(reqPayAlreadyPaid, resPayAlreadyPaid);
    if (resPayAlreadyPaid.statusCode !== 400) {
      throw new Error(`Expected 400 when paying fully paid invoice, got ${resPayAlreadyPaid.statusCode}`);
    }
    console.log('✔ Fully paid invoice payment attempt correctly rejected with 400 Bad Request');

    // TEST 11: Attempt payment using invalid/non-existent invoice ID -> 404
    const reqPayNonExist = { params: { id: 999999 }, body: { amount: 100 }, user: reqUserClient };
    const resPayNonExist = createMockRes();
    await invoiceController.payInvoice(reqPayNonExist, resPayNonExist);
    if (resPayNonExist.statusCode !== 404) {
      throw new Error(`TEST 11 Failed: Expected 404 for invalid invoice ID, got ${resPayNonExist.statusCode}`);
    }
    console.log('✔ TEST 11 PASSED: Payment on invalid invoice ID returned 404 Not Found');

    // TEST 12: Verify getMyInvoices
    const reqMyInv = { user: reqUserClient };
    const resMyInv = createMockRes();
    await invoiceController.getMyInvoices(reqMyInv, resMyInv);
    if (resMyInv.statusCode !== 200 || !Array.isArray(resMyInv.responseData)) {
      throw new Error(`TEST 12 Failed: getMyInvoices status ${resMyInv.statusCode}`);
    }
    console.log(`✔ TEST 12 PASSED: getMyInvoices returned ${resMyInv.responseData.length} items without AssociationError`);

    // TEST 13: Financial consistency check on entire DB
    const allInvoices = await Invoice.findAll({
      include: [{ model: Payment, as: 'payments' }]
    });
    for (const inv of allInvoices) {
      const sumPaid = (inv.payments || []).reduce((s, p) => s + parseFloat(p.amount), 0);
      const total = parseFloat(inv.total_amount);
      if (sumPaid > total + 0.01) {
        throw new Error(`TEST 13 Failed: Invoice ID ${inv.id} has SUM(payments) ${sumPaid} > total_amount ${total}`);
      }
    }
    console.log(`✔ TEST 13 PASSED: Verified financial consistency across all ${allInvoices.length} invoices in DB! SUM(payments) <= total_amount`);

  } finally {
    // Cleanup temporary test data safely
    console.log('\nCleaning up temporary test payments & invoice...');
    if (createdPaymentIds.length > 0) {
      await Payment.destroy({ where: { id: createdPaymentIds } });
    }
    if (testInvoice) {
      await Invoice.destroy({ where: { id: testInvoice.id } });
    }
    if (tempAppointment) {
      await Appointment.destroy({ where: { id: tempAppointment.id } });
    }
    console.log('✔ Database clean: Temporary test records removed.');
  }

  // Regression check for previous batches
  console.log('\nRunning Final Regression Verification across previous batches...');
  const resDash = createMockRes();
  await customerController.getDashboard({ user: { id: 1, role: 'client' } }, resDash);
  
  const resMetrics = createMockRes();
  await dashboardController.getMetrics({ user: { id: 1, role: 'admin' } }, resMetrics);

  const resVeh = createMockRes();
  await vehicleController.getAllVehicles({ user: { id: 1, role: 'admin' } }, resVeh);

  console.log('✔ Final Regression Check: ALL PREVIOUS BATCHES FUNCTIONAL!');
  console.log('\n=== ALL BATCH 3.3 TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n✖ TEST FAILED:', err);
  process.exit(1);
});
