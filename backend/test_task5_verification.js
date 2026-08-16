'use strict';

const assert = require('assert');
const { User, Vehicle, Appointment, AppointmentMechanic, AuditLog, TechnicalReport, RequiredPart, SparePart, sequelize } = require('./models');
const appointmentController = require('./controllers/appointmentController');
const technicalReportController = require('./controllers/technicalReportController');
const requiredPartController = require('./controllers/requiredPartController');

function createResMock() {
  return {
    statusCode: 200,
    responseData: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; }
  };
}

async function runTask5Verification() {
  console.log('=== STARTING SAFWA TASK 5 VERIFICATION TESTS ===\n');

  let passed = 0;
  let failed = 0;

  function check(condition, message) {
    if (condition) {
      console.log(`✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failed++;
    }
  }

  const createdUserIds = [];
  const createdVehicleIds = [];
  const createdAppointmentIds = [];
  const createdAuditLogIds = [];

  try {
    const ts = Date.now();

    // 1. Setup Test Users
    const superAdmin = await User.findOne({ where: { role: 'super_admin' } });
    check(!!superAdmin, 'Super admin user exists');

    const admin = await User.create({
      name: `T5 Admin ${ts}`,
      email: `t5_admin_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'admin',
      status: 'active',
      is_email_verified: true
    });
    createdUserIds.push(admin.id);

    const mech1 = await User.create({
      name: `T5 Mechanic 1 ${ts}`,
      email: `t5_mech1_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'mechanic',
      status: 'active',
      is_email_verified: true
    });
    createdUserIds.push(mech1.id);

    const mech2 = await User.create({
      name: `T5 Mechanic 2 ${ts}`,
      email: `t5_mech2_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'mechanic',
      status: 'active',
      is_email_verified: true
    });
    createdUserIds.push(mech2.id);

    const mech3 = await User.create({
      name: `T5 Mechanic 3 ${ts}`,
      email: `t5_mech3_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'mechanic',
      status: 'active',
      is_email_verified: true
    });
    createdUserIds.push(mech3.id);

    const unassignedMech = await User.create({
      name: `T5 Unassigned Mech ${ts}`,
      email: `t5_unassigned_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'mechanic',
      status: 'active',
      is_email_verified: true
    });
    createdUserIds.push(unassignedMech.id);

    const client = await User.create({
      name: `T5 Client ${ts}`,
      email: `t5_client_${ts}@safwa.sa`,
      phone: '0511223344',
      password: 'hashedpassword',
      role: 'client',
      status: 'active',
      is_email_verified: true
    });
    createdUserIds.push(client.id);

    // 2. Setup Test Vehicles & Appointments
    const vehicle1 = await Vehicle.create({
      client_id: client.id,
      make: `MakeT5_${ts}`,
      model: `ModelT5_${ts}`,
      license_plate: `T5-PLT-${ts}-1`
    });
    createdVehicleIds.push(vehicle1.id);

    const vehicle2 = await Vehicle.create({
      client_id: client.id,
      make: `MakeT5B_${ts}`,
      model: `ModelT5B_${ts}`,
      license_plate: `T5-PLT-${ts}-2`
    });
    createdVehicleIds.push(vehicle2.id);

    const appt1 = await Appointment.create({
      client_id: client.id,
      vehicle_id: vehicle1.id,
      problem_description: 'Multi-mechanic test appt 1',
      status: 'pending',
      scheduled_date: new Date()
    });
    createdAppointmentIds.push(appt1.id);

    const appt2 = await Appointment.create({
      client_id: client.id,
      vehicle_id: vehicle2.id,
      problem_description: 'Multi-mechanic test appt 2',
      status: 'pending',
      scheduled_date: new Date()
    });
    createdAppointmentIds.push(appt2.id);

    // --- TEST 1 & 2: 1 Appointment -> 2 and 3 Mechanics ---
    console.log('\n[1/18] Testing 1 Appointment -> 2 and 3 Mechanics...');
    
    // Assign 2 mechanics
    const reqAssign2 = {
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [mech1.id, mech2.id] }
    };
    const resAssign2 = createResMock();
    await appointmentController.updateAppointment(reqAssign2, resAssign2);
    check(resAssign2.statusCode === 200, 'Assigning 2 mechanics returns 200 OK');

    const amCheck2 = await AppointmentMechanic.findAll({ where: { appointment_id: appt1.id } });
    check(amCheck2.length === 2, 'Appointment 1 has 2 mechanic junction records');

    // Assign 3 mechanics
    const reqAssign3 = {
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [mech1.id, mech2.id, mech3.id] }
    };
    const resAssign3 = createResMock();
    await appointmentController.updateAppointment(reqAssign3, resAssign3);
    check(resAssign3.statusCode === 200, 'Assigning 3 mechanics returns 200 OK');

    const amCheck3 = await AppointmentMechanic.findAll({ where: { appointment_id: appt1.id } });
    check(amCheck3.length === 3, 'Appointment 1 has 3 mechanic junction records');

    // --- TEST 3: 1 Mechanic -> Multiple Appointments ---
    console.log('\n[2/18] Testing 1 Mechanic -> Multiple Appointments...');
    const reqAssignAppt2 = {
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt2.id) },
      body: { mechanic_ids: [mech1.id] }
    };
    const resAssignAppt2 = createResMock();
    await appointmentController.updateAppointment(reqAssignAppt2, resAssignAppt2);
    check(resAssignAppt2.statusCode === 200, 'Assigning Mech1 to Appt 2 returns 200 OK');

    const mech1Appts = await AppointmentMechanic.findAll({ where: { mechanic_id: mech1.id } });
    check(mech1Appts.length === 2, 'Mechanic 1 assigned to 2 different appointments simultaneously');

    // --- TEST 4 & 17: Duplicate mechanic IDs prevention ---
    console.log('\n[3/18] Testing Duplicate Mechanic ID Prevention...');
    const reqDup = {
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [mech1.id, mech1.id, mech2.id, mech2.id] }
    };
    const resDup = createResMock();
    await appointmentController.updateAppointment(reqDup, resDup);
    check(resDup.statusCode === 200, 'Duplicate IDs request handled gracefully');

    const amCheckDup = await AppointmentMechanic.findAll({ where: { appointment_id: appt1.id } });
    check(amCheckDup.length === 2, 'Junction table contains exactly 2 unique mechanic records (no duplicates)');

    // --- TEST 5: Invalid Mechanic ID validation ---
    console.log('\n[4/18] Testing Invalid Mechanic ID Validation...');
    const reqInvalidRole = {
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [mech1.id, client.id] } // client is not a mechanic
    };
    const resInvalidRole = createResMock();
    await appointmentController.updateAppointment(reqInvalidRole, resInvalidRole);
    check(resInvalidRole.statusCode === 400, 'Passing non-mechanic user ID rejected with 400 Bad Request');

    const reqInvalidId = {
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [99999999] }
    };
    const resInvalidId = createResMock();
    await appointmentController.updateAppointment(reqInvalidId, resInvalidId);
    check(resInvalidId.statusCode === 400, 'Passing non-existent mechanic ID rejected with 400 Bad Request');

    // --- TEST 6: Client / Admin / Mechanic Role Validation ---
    console.log('\n[5/18] Testing Role Validation for Appointment Updates...');
    const reqClientUpdate = {
      user: { id: client.id, role: 'client' },
      params: { id: String(appt1.id) },
      body: { status: 'in_progress' }
    };
    const resClientUpdate = createResMock();
    await appointmentController.updateAppointment(reqClientUpdate, resClientUpdate);
    check(resClientUpdate.statusCode === 404 || resClientUpdate.statusCode === 403, 'Client forbidden from updating appointment via admin endpoint');

    const reqMechRestricted = {
      user: { id: mech1.id, role: 'mechanic' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [mech3.id] }
    };
    const resMechRestricted = createResMock();
    await appointmentController.updateAppointment(reqMechRestricted, resMechRestricted);
    check(resMechRestricted.statusCode === 400, 'Mechanic attempt to change mechanic_ids rejected with 400');

    // --- TEST 7: Remove One Mechanic ---
    console.log('\n[6/18] Testing Partial Mechanic Removal...');
    // Currently appt1 has [mech1.id, mech2.id]. Update to [mech1.id].
    const reqRemOne = {
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [mech1.id] }
    };
    const resRemOne = createResMock();
    await appointmentController.updateAppointment(reqRemOne, resRemOne);
    check(resRemOne.statusCode === 200, 'Partial mechanic removal returns 200 OK');

    const amRemOne = await AppointmentMechanic.findAll({ where: { appointment_id: appt1.id } });
    check(amRemOne.length === 1 && amRemOne[0].mechanic_id === mech1.id, 'Mechanic 2 removed, Mechanic 1 remains assigned');

    // --- TEST 8 & 9: Remove All Mechanics & Legacy mechanic_id Sync ---
    console.log('\n[7/18] Testing Empty Mechanic List & Legacy Sync...');
    
    // First assign mech1 and mech2 to check sync
    await appointmentController.updateAppointment({
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [mech2.id, mech1.id] }
    }, createResMock());

    const apptSyncCheck = await Appointment.findByPk(appt1.id);
    check(apptSyncCheck.mechanic_id === mech2.id, 'Legacy appointments.mechanic_id synced with first assigned mechanic');

    // Now remove all mechanics
    const reqRemAll = {
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [] }
    };
    const resRemAll = createResMock();
    await appointmentController.updateAppointment(reqRemAll, resRemAll);
    check(resRemAll.statusCode === 200, 'Removing all mechanics returns 200 OK');

    const amRemAll = await AppointmentMechanic.findAll({ where: { appointment_id: appt1.id } });
    check(amRemAll.length === 0, 'Junction table empty for appointment');

    const apptClearedCheck = await Appointment.findByPk(appt1.id);
    check(apptClearedCheck.mechanic_id === null, 'Legacy appointments.mechanic_id cleared to null');

    // --- TEST 10: Mechanic Assigned Task Retrieval ---
    console.log('\n[8/18] Testing Mechanic Assigned Tasks Retrieval...');
    // Reassign mech1 to appt1 and appt2
    await appointmentController.updateAppointment({
      user: { id: admin.id, role: 'admin' },
      params: { id: String(appt1.id) },
      body: { mechanic_ids: [mech1.id, mech3.id] }
    }, createResMock());

    const reqAssignedMech1 = { user: { id: mech1.id, role: 'mechanic' } };
    const resAssignedMech1 = createResMock();
    await appointmentController.getAssignedTasks(reqAssignedMech1, resAssignedMech1);
    check(resAssignedMech1.statusCode === 200, 'getAssignedTasks returned 200 OK');
    check(resAssignedMech1.responseData.length >= 2, 'Mechanic 1 sees all assigned appointments (Appt 1 and Appt 2)');

    // --- TEST 11: Unassigned Mechanic Access ---
    console.log('\n[9/18] Testing Unassigned Mechanic Access Protection...');
    const reqUnassignedGet = { user: { id: unassignedMech.id, role: 'mechanic' }, params: { id: String(appt1.id) } };
    const resUnassignedGet = createResMock();
    await appointmentController.getAppointmentById(reqUnassignedGet, resUnassignedGet);
    check(resUnassignedGet.statusCode === 404, 'Unassigned mechanic forbidden from viewing appointment (404)');

    const reqUnassignedUpdate = { user: { id: unassignedMech.id, role: 'mechanic' }, params: { id: String(appt1.id) }, body: { status: 'completed' } };
    const resUnassignedUpdate = createResMock();
    await appointmentController.updateAppointment(reqUnassignedUpdate, resUnassignedUpdate);
    check(resUnassignedUpdate.statusCode === 404, 'Unassigned mechanic forbidden from updating appointment status (404)');

    // --- TEST 12: Technical Report Authorization ---
    console.log('\n[10/18] Testing Technical Report Authorization...');
    const reqReportAssigned = {
      user: { id: mech1.id, role: 'mechanic' },
      body: { appointment_id: appt1.id, diagnostics: 'Assigned report test' }
    };
    const resReportAssigned = createResMock();
    await technicalReportController.createReport(reqReportAssigned, resReportAssigned);
    check(resReportAssigned.statusCode === 201, 'Assigned mechanic can create technical report (201 Created)');

    const reqReportUnassigned = {
      user: { id: unassignedMech.id, role: 'mechanic' },
      body: { appointment_id: appt1.id, diagnostics: 'Unassigned report test' }
    };
    const resReportUnassigned = createResMock();
    await technicalReportController.createReport(reqReportUnassigned, resReportUnassigned);
    check(resReportUnassigned.statusCode === 404, 'Unassigned mechanic forbidden from creating technical report (404)');

    // --- TEST 13, 14, 15, 16: Audit Trail Assignment, Removal, Identity & Sanitization ---
    console.log('\n[11/18] Testing Audit Trail for Multi-Mechanic Events...');
    const auditAssign = await AuditLog.findOne({
      where: { action: 'APPOINTMENT_MECHANIC_ASSIGNED', entity_id: String(appt1.id) },
      order: [['created_at', 'DESC']]
    });
    check(!!auditAssign, 'APPOINTMENT_MECHANIC_ASSIGNED audit log recorded');
    check(auditAssign && String(auditAssign.actor_user_id) === String(admin.id), 'actor_user_id matches authenticated admin ID');
    if (auditAssign) createdAuditLogIds.push(auditAssign.id);

    const auditRemove = await AuditLog.findOne({
      where: { action: 'APPOINTMENT_MECHANIC_REMOVED', entity_id: String(appt1.id) },
      order: [['created_at', 'DESC']]
    });
    check(!!auditRemove, 'APPOINTMENT_MECHANIC_REMOVED audit log recorded');
    if (auditRemove) createdAuditLogIds.push(auditRemove.id);

    // Sanitization check
    const logsStr = JSON.stringify([auditAssign, auditRemove]);
    check(!logsStr.includes('hashedpassword') && !logsStr.includes('safwa_secret'), 'Zero sensitive secrets or passwords in audit logs');

    // --- TEST 18: Regression Checks ---
    console.log('\n[12/18] Testing System Regression Integrity...');
    const superAdminCheck = await User.findOne({ where: { role: 'super_admin' } });
    check(superAdminCheck && superAdminCheck.role === 'super_admin', 'Super Admin hierarchy intact');

    const apptGetAdmin = { user: { id: admin.id, role: 'admin' }, query: {} };
    const resApptGetAdmin = createResMock();
    await appointmentController.getAllAppointments(apptGetAdmin, resApptGetAdmin);
    check(resApptGetAdmin.statusCode === 200 && Array.isArray(resApptGetAdmin.responseData), 'Admin can fetch all appointments with mechanics list');

  } catch (err) {
    console.error('\n❌ UNEXPECTED TEST ERROR:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP TEMPORARY TEST DATA ---');
    if (createdAppointmentIds.length > 0) {
      await TechnicalReport.destroy({ where: { appointment_id: createdAppointmentIds } });
      await AppointmentMechanic.destroy({ where: { appointment_id: createdAppointmentIds } });
      await Appointment.destroy({ where: { id: createdAppointmentIds } });
    }
    if (createdVehicleIds.length > 0) {
      await Vehicle.destroy({ where: { id: createdVehicleIds } });
    }
    if (createdUserIds.length > 0) {
      await User.destroy({ where: { id: createdUserIds } });
    }
    if (createdAuditLogIds.length > 0) {
      await AuditLog.destroy({ where: { id: createdAuditLogIds } });
    }
    console.log('✓ Cleanup completed: Database state pristine');
  }

  console.log('\n======================================');
  console.log(`TASK 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTask5Verification();
