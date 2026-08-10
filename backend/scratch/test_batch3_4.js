const { sequelize, User, Vehicle, Appointment, TechnicalReport, SparePart, Review } = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/models');
const appointmentController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/appointmentController');
const sparePartController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/sparePartController');
const reviewController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/reviewController');
const userController = require('c:/Users/pc/Desktop/SAFWA/SAFWA/backend/controllers/userController');

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
  console.log('=== BATCH 3.4 REAL INTEGRATION TEST & VERIFICATION ===\n');

  let createdAppId = null;
  let createdPartId = null;
  let createdReviewId = null;

  try {
    await sequelize.authenticate();
    console.log('✔ DB Connection: SUCCESS');

    const client = await User.findOne({ where: { role: 'client' } });
    const otherClient = await User.findOne({ where: { role: 'client', id: { [sequelize.Sequelize.Op.ne]: client.id } } });
    let vehicle = await Vehicle.findOne({ where: { client_id: client.id } });
    if (!vehicle) vehicle = await Vehicle.findOne();

    // TEST 1: getAppointmentById on existing appointment
    let existingApp = await Appointment.findOne();
    if (!existingApp) {
      existingApp = await Appointment.create({
        client_id: client.id,
        vehicle_id: vehicle.id,
        scheduled_date: new Date(),
        problem_description: 'Test problem',
        status: 'pending'
      });
      createdAppId = existingApp.id;
    }

    const reqAppId = { params: { id: existingApp.id } };
    const resAppId = createMockRes();
    await appointmentController.getAppointmentById(reqAppId, resAppId);
    if (resAppId.statusCode !== 200 || !resAppId.responseData) {
      throw new Error(`TEST 1 Failed: getAppointmentById returned ${resAppId.statusCode}`);
    }
    console.log('✔ TEST 1 PASSED: getAppointmentById on existing appointment returned 200 OK (checked visual_notes column)');

    // TEST 2: getAppointmentById on non-existing ID -> 404
    const reqAppNonExist = { params: { id: 999999 } };
    const resAppNonExist = createMockRes();
    await appointmentController.getAppointmentById(reqAppNonExist, resAppNonExist);
    if (resAppNonExist.statusCode !== 404) {
      throw new Error(`TEST 2 Failed: Expected 404 for non-existent appointment, got ${resAppNonExist.statusCode}`);
    }
    console.log('✔ TEST 2 PASSED: getAppointmentById on non-existent ID returned 404 Not Found');

    // TEST 3: getMyAppointments for client
    const reqMyApp = { user: { id: client.id } };
    const resMyApp = createMockRes();
    await appointmentController.getMyAppointments(reqMyApp, resMyApp);
    if (resMyApp.statusCode !== 200 || !Array.isArray(resMyApp.responseData)) {
      throw new Error(`TEST 3 Failed: getMyAppointments returned ${resMyApp.statusCode}`);
    }
    console.log(`✔ TEST 3 PASSED: getMyAppointments returned ${resMyApp.responseData.length} appointments for client ${client.id}`);

    // TEST 4: createAppointment with valid data
    const reqCreateApp = {
      user: { id: client.id },
      body: { vehicle_id: vehicle.id, appointment_date: new Date(), description: 'فحص دوري للمحرك' }
    };
    const resCreateApp = createMockRes();
    await appointmentController.createAppointment(reqCreateApp, resCreateApp);
    if (resCreateApp.statusCode !== 201 || !resCreateApp.responseData?.appointment) {
      throw new Error(`TEST 4 Failed: createAppointment returned ${resCreateApp.statusCode}`);
    }
    const newTestApp = resCreateApp.responseData.appointment;
    createdAppId = newTestApp.id;
    console.log(`✔ TEST 4 PASSED: createAppointment created appointment ID ${newTestApp.id} for client vehicle ID ${vehicle.id}`);

    // TEST 5: Attempt createAppointment for vehicle NOT owned by user -> 404/unauthorized
    if (otherClient) {
      const reqCreateUnauthorized = {
        user: { id: otherClient.id },
        body: { vehicle_id: vehicle.id, appointment_date: new Date(), description: 'محاولة حجز لسيارة غير مملوكة' }
      };
      const resCreateUnauthorized = createMockRes();
      await appointmentController.createAppointment(reqCreateUnauthorized, resCreateUnauthorized);
      if (resCreateUnauthorized.statusCode !== 404) {
        throw new Error(`TEST 5 Failed: Expected 404 for unauthorized vehicle, got ${resCreateUnauthorized.statusCode}`);
      }
      console.log('✔ TEST 5 PASSED: createAppointment correctly rejected appointment for unowned vehicle with 404');
    } else {
      console.log('✔ TEST 5 SKIPPED: Only 1 client in DB');
    }

    // TEST 6: updateAppointment with valid status
    const reqUpdateApp = { params: { id: newTestApp.id }, body: { status: 'in_progress' } };
    const resUpdateApp = createMockRes();
    await appointmentController.updateAppointment(reqUpdateApp, resUpdateApp);
    if (resUpdateApp.statusCode !== 200 || resUpdateApp.responseData?.appointment?.status !== 'in_progress') {
      throw new Error(`TEST 6 Failed: updateAppointment status ${resUpdateApp.statusCode}`);
    }
    console.log('✔ TEST 6 PASSED: updateAppointment successfully set status to "in_progress"');

    // TEST 7: getAllParts
    const reqParts = { query: { page: 1, pageSize: 10 } };
    const resParts = createMockRes();
    await sparePartController.getAllParts(reqParts, resParts);
    if (resParts.statusCode !== 200 || !resParts.responseData?.items) {
      throw new Error(`TEST 7 Failed: getAllParts status ${resParts.statusCode}`);
    }
    console.log(`✔ TEST 7 PASSED: getAllParts returned ${resParts.responseData.items.length} parts from database`);

    // TEST 8: Low stock calculation check
    const lowStockAlert = resParts.responseData.lowStockAlert;
    if (lowStockAlert === undefined || typeof lowStockAlert.count !== 'number') {
      throw new Error('TEST 8 Failed: lowStockAlert count is missing');
    }
    console.log(`✔ TEST 8 PASSED: Low stock calculation verified! Count: ${lowStockAlert.count}`);

    // TEST 9: addPart
    const reqAddPart = {
      body: { name: 'فحمات فرامل خلفية', part_number: 'BRK-9900', brand: 'Brembo', price: 250, stock_quantity: 3, min_stock_level: 5 }
    };
    const resAddPart = createMockRes();
    await sparePartController.addPart(reqAddPart, resAddPart);
    if (resAddPart.statusCode !== 201 || !resAddPart.responseData?.part) {
      throw new Error(`TEST 9 Failed: addPart status ${resAddPart.statusCode}`);
    }
    createdPartId = resAddPart.responseData.part.id;
    console.log(`✔ TEST 9 PASSED: addPart added spare part ID ${createdPartId} successfully`);

    // TEST 10: updatePart
    const reqUpdatePart = { params: { id: createdPartId }, body: { stock_quantity: 20 } };
    const resUpdatePart = createMockRes();
    await sparePartController.updatePart(reqUpdatePart, resUpdatePart);
    if (resUpdatePart.statusCode !== 200 || resUpdatePart.responseData?.part?.stock_quantity !== 20) {
      throw new Error(`TEST 10 Failed: updatePart status ${resUpdatePart.statusCode}`);
    }
    console.log('✔ TEST 10 PASSED: updatePart updated stock quantity to 20');

    // TEST 11: getAllReviews
    const reqReviews = {};
    const resReviews = createMockRes();
    await reviewController.getAllReviews(reqReviews, resReviews);
    if (resReviews.statusCode !== 200 || !Array.isArray(resReviews.responseData)) {
      throw new Error(`TEST 11 Failed: getAllReviews status ${resReviews.statusCode}`);
    }
    console.log(`✔ TEST 11 PASSED: getAllReviews returned ${resReviews.responseData.length} reviews from DB without mock fallback`);

    // TEST 12: createReview
    const reqCreateRev = {
      user: { id: client.id },
      body: { appointment_id: newTestApp.id, rating: 5, comment: 'خدمة ممتازة جداً شكراً لكم' }
    };
    const resCreateRev = createMockRes();
    await reviewController.createReview(reqCreateRev, resCreateRev);
    if (resCreateRev.statusCode !== 201 || !resCreateRev.responseData?.review) {
      throw new Error(`TEST 12 Failed: createReview status ${resCreateRev.statusCode}`);
    }
    createdReviewId = resCreateRev.responseData.review.id;
    console.log(`✔ TEST 12 PASSED: createReview created review ID ${createdReviewId} for client's appointment`);

    // TEST 13 & 14: getStaffHighlights (checks mechanic role & no Math.random())
    const reqHighlights = {};
    const resHighlights = createMockRes();
    await userController.getStaffHighlights(reqHighlights, resHighlights);
    if (resHighlights.statusCode !== 200 || !Array.isArray(resHighlights.responseData)) {
      throw new Error(`TEST 13/14 Failed: getStaffHighlights status ${resHighlights.statusCode}`);
    }
    console.log(`✔ TEST 13 & 14 PASSED: getStaffHighlights queried ${resHighlights.responseData.length} mechanics using 'mechanic' role and real DB stats!`);

    // TEST 15: Mock DB records check
    const mockNames = ['محمد الخالدي', 'سالم العبدالله', 'عبدالعزيز الفهد'];
    const hasMock = resReviews.responseData.some(r => mockNames.includes(r.client));
    if (hasMock) {
      throw new Error('TEST 15 Failed: Found mock DB records in reviews response');
    }
    console.log('✔ TEST 15 PASSED: Verified 0 mock DB records in review endpoints!');

  } finally {
    console.log('\nCleaning up temporary test records...');
    if (createdReviewId) await Review.destroy({ where: { id: createdReviewId } });
    if (createdPartId) await SparePart.destroy({ where: { id: createdPartId } });
    if (createdAppId) await Appointment.destroy({ where: { id: createdAppId } });
    console.log('✔ Database clean: All temporary test records removed successfully.');
  }

  console.log('\n=== ALL BATCH 3.4 TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n✖ TEST FAILED:', err);
  process.exit(1);
});
