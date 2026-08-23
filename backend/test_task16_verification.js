'use strict';

const { User, Vehicle, Appointment, AppointmentMechanic, TechnicalReport, RequiredPart, Review, AuditLog } = require('./models');
const appointmentController = require('./controllers/appointmentController');
const reviewController = require('./controllers/reviewController');
const technicalReportController = require('./controllers/technicalReportController');

function createResMock() {
  return {
    statusCode: 200,
    responseData: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; }
  };
}

let testAdmin, testMechanic1, testMechanic2, testClient;
let testVehicle;
let createdApptIds = [];

async function setupTestData() {
  console.log('--- SETTING UP TASK 16 TEST DATA ---');
  const ts = Date.now();

  testAdmin = await User.create({
    name: `T16 Admin ${ts}`,
    email: `t16_admin_${ts}@safwa.test`,
    password: 'hashedPassword123',
    role: 'admin',
    status: 'active'
  });

  testMechanic1 = await User.create({
    name: `T16 Mechanic1 ${ts}`,
    email: `t16_mech1_${ts}@safwa.test`,
    password: 'hashedPassword123',
    role: 'mechanic',
    status: 'active'
  });

  testMechanic2 = await User.create({
    name: `T16 Mechanic2 ${ts}`,
    email: `t16_mech2_${ts}@safwa.test`,
    password: 'hashedPassword123',
    role: 'mechanic',
    status: 'active'
  });

  testClient = await User.create({
    name: `T16 Client ${ts}`,
    email: `t16_client_${ts}@safwa.test`,
    password: 'hashedPassword123',
    role: 'client',
    status: 'active'
  });

  testVehicle = await Vehicle.create({
    client_id: testClient.id,
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    license_plate: `T16-${ts.toString().slice(-4)}`
  });
}

async function cleanupTestData() {
  console.log('--- CLEANING UP TASK 16 TEST DATA ---');
  try {
    if (createdApptIds.length > 0) {
      await Review.destroy({ where: { appointment_id: createdApptIds } });
      await RequiredPart.destroy({
        where: {
          technical_report_id: (await TechnicalReport.findAll({ where: { appointment_id: createdApptIds } })).map(r => r.id)
        }
      });
      await TechnicalReport.destroy({ where: { appointment_id: createdApptIds } });
      await AppointmentMechanic.destroy({ where: { appointment_id: createdApptIds } });
      await Appointment.destroy({ where: { id: createdApptIds } });
    }
    if (testVehicle) await Vehicle.destroy({ where: { id: testVehicle.id } });
    await User.destroy({
      where: {
        id: [testAdmin.id, testMechanic1.id, testMechanic2.id, testClient.id]
      }
    });
    console.log('✓ Cleanup completed');
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
    console.log('\n=== SAFWA TASK 16 VERIFICATION TESTS ===\n');

    // 1. Client creates appointment -> status is pending
    let apptId;
    {
      const req = {
        user: { id: testClient.id, role: 'client' },
        body: {
          vehicle_id: testVehicle.id,
          scheduled_date: '2026-08-20',
          scheduled_time: '10:00 AM',
          problem_description: 'Task 16 engine check'
        }
      };
      const res = createResMock();
      await appointmentController.createAppointment(req, res);
      assert(res.statusCode === 201 && res.responseData.appointment.status === 'pending', 'Client created appointment with initial status pending');
      apptId = res.responseData.appointment.id;
      createdApptIds.push(apptId);
    }

    // 2. Client attempts direct status modification -> 403 Forbidden
    {
      const req = {
        user: { id: testClient.id, role: 'client' },
        params: { id: String(apptId) },
        body: { status: 'completed' }
      };
      const res = createResMock();
      await appointmentController.updateAppointment(req, res);
      assert(res.statusCode === 403, 'Client forbidden from mutating appointment status directly (403)');
    }

    // 3. Invalid Transition: Admin attempts transition pending -> completed directly -> 400 Bad Request
    {
      const req = {
        user: { id: testAdmin.id, role: 'admin' },
        params: { id: String(apptId) },
        body: { status: 'completed' }
      };
      const res = createResMock();
      await appointmentController.updateAppointment(req, res);
      assert(res.statusCode === 400, 'Invalid transition pending -> completed rejected with 400 Bad Request');
    }

    // 4. Admin assigns multi-mechanics and transitions status to under_inspection -> 200 OK
    {
      const req = {
        user: { id: testAdmin.id, role: 'admin' },
        params: { id: String(apptId) },
        body: {
          status: 'under_inspection',
          mechanic_ids: [testMechanic1.id, testMechanic2.id]
        }
      };
      const res = createResMock();
      await appointmentController.updateAppointment(req, res);
      assert(res.statusCode === 200 && res.responseData.appointment.status === 'under_inspection', 'Admin assigned mechanics and updated status to under_inspection');

      const mechanics = await AppointmentMechanic.findAll({ where: { appointment_id: apptId } });
      assert(mechanics.length === 2, 'Multi-mechanic junction table recorded 2 assigned mechanics');
    }

    // 5. Unassigned mechanic attempts to update status -> 404/403
    {
      const unassignedMechanic = await User.create({
        name: 'Unassigned Mech',
        email: `unassigned_${Date.now()}@safwa.test`,
        password: 'pass',
        role: 'mechanic',
        status: 'active'
      });
      const req = {
        user: { id: unassignedMechanic.id, role: 'mechanic' },
        params: { id: String(apptId) },
        body: { status: 'in_progress' }
      };
      const res = createResMock();
      await appointmentController.updateAppointment(req, res);
      assert(res.statusCode === 404 || res.statusCode === 403, 'Unassigned mechanic blocked from modifying appointment status');
      await User.destroy({ where: { id: unassignedMechanic.id } });
    }

    // 6. Assigned Mechanic updates status under_inspection -> in_progress -> 200 OK
    {
      const req = {
        user: { id: testMechanic1.id, role: 'mechanic' },
        params: { id: String(apptId) },
        body: { status: 'in_progress' }
      };
      const res = createResMock();
      await appointmentController.updateAppointment(req, res);
      assert(res.statusCode === 200 && res.responseData.appointment.status === 'in_progress', 'Assigned mechanic moved status to in_progress');
    }

    // 7. Mechanic attempts to mutate restricted fields (problem_description, vehicle_id) -> 400 Bad Request
    {
      const req = {
        user: { id: testMechanic1.id, role: 'mechanic' },
        params: { id: String(apptId) },
        body: { status: 'in_progress', problem_description: 'Tampered' }
      };
      const res = createResMock();
      await appointmentController.updateAppointment(req, res);
      assert(res.statusCode === 400, 'Mechanic mutation of restricted fields blocked with 400 Bad Request');
    }

    // 8. Mechanic transitions status in_progress -> ready_for_pickup -> 200 OK
    {
      const req = {
        user: { id: testMechanic2.id, role: 'mechanic' },
        params: { id: String(apptId) },
        body: { status: 'ready_for_pickup' }
      };
      const res = createResMock();
      await appointmentController.updateAppointment(req, res);
      assert(res.statusCode === 200 && res.responseData.appointment.status === 'ready_for_pickup', 'Second assigned mechanic updated status to ready_for_pickup');
    }

    // 9. Client leaves review while appointment is ready_for_pickup -> 201 Created
    {
      const req = {
        user: { id: testClient.id, role: 'client' },
        body: {
          appointment_id: apptId,
          rating: 5,
          comment: 'Excellent service and quick repair!'
        }
      };
      const res = createResMock();
      await reviewController.createReview(req, res);
      if (res.statusCode !== 201) {
        console.error('Step 9 Failed. res:', res.statusCode, res.responseData);
      }
      assert(res.statusCode === 201, 'Client submitted review for ready_for_pickup appointment');
    }

    // 10. Admin completes appointment: ready_for_pickup -> completed -> 200 OK
    {
      const req = {
        user: { id: testAdmin.id, role: 'admin' },
        params: { id: String(apptId) },
        body: { status: 'completed' }
      };
      const res = createResMock();
      await appointmentController.updateAppointment(req, res);
      assert(res.statusCode === 200 && res.responseData.appointment.status === 'completed', 'Admin completed appointment');
    }

    // 11. Terminal state enforcement: Attempt to mutate completed appointment -> 400 Bad Request
    {
      const req = {
        user: { id: testAdmin.id, role: 'admin' },
        params: { id: String(apptId) },
        body: { status: 'in_progress' }
      };
      const res = createResMock();
      await appointmentController.updateAppointment(req, res);
      assert(res.statusCode === 400, 'State mutation on completed appointment blocked with 400 Bad Request');
    }

    // 12. Non-repudiation: Audit log check
    {
      const audit = await AuditLog.findOne({
        where: {
          action: 'APPOINTMENT_STATUS_CHANGED',
          entity_id: String(apptId)
        }
      });
      assert(audit !== null && audit.actor_user_id !== null, 'APPOINTMENT_STATUS_CHANGED audit log recorded with authentic actor_user_id');
    }

  } catch (err) {
    console.error('Global verification test error:', err);
  } finally {
    await cleanupTestData();

    console.log('\n======================================');
    console.log(`TASK 16 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================\n');
    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

runTests();
