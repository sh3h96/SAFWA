'use strict';

const assert = require('assert');
const { User, Vehicle, Appointment, AuditLog, sequelize } = require('./models');
const vehicleController = require('./controllers/vehicleController');
const auditLogController = require('./controllers/auditLogController');

function createResMock() {
  return {
    statusCode: 200,
    responseData: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; }
  };
}

async function runTask4Verification() {
  console.log('--- STARTING SAFWA TASK 4 VERIFICATION TESTS ---\n');

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
      name: `T4 Admin ${ts}`,
      email: `t4_admin_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'admin',
      status: 'active',
      is_email_verified: true
    });
    createdUserIds.push(admin.id);

    const mechanic = await User.create({
      name: `T4 Mechanic ${ts}`,
      email: `t4_mechanic_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'mechanic',
      status: 'active',
      is_email_verified: true
    });
    createdUserIds.push(mechanic.id);

    const client = await User.create({
      name: `T4 Client ${ts}`,
      email: `t4_client_${ts}@safwa.sa`,
      phone: '0599887766',
      password: 'hashedpassword',
      role: 'client',
      status: 'active',
      is_email_verified: true
    });
    createdUserIds.push(client.id);

    // 2. Setup Test Vehicles
    const vehicle1 = await Vehicle.create({
      client_id: client.id,
      make: `BrandT4_${ts}`,
      model: `ModelX_${ts}`,
      year: 2024,
      license_plate: `T4-PLT-${ts}-1`,
      vin: `VIN-T4-1-${ts}`
    });
    createdVehicleIds.push(vehicle1.id);

    const vehicleWithHistory = await Vehicle.create({
      client_id: client.id,
      make: `BrandHist_${ts}`,
      model: `ModelH_${ts}`,
      year: 2022,
      license_plate: `T4-HIST-${ts}-2`,
      vin: `VIN-T4-2-${ts}`
    });
    createdVehicleIds.push(vehicleWithHistory.id);

    // Setup Historical Appointment
    const appt = await Appointment.create({
      client_id: client.id,
      vehicle_id: vehicleWithHistory.id,
      scheduled_date: new Date(),
      problem_description: 'Test inspection history',
      status: 'completed'
    });
    createdAppointmentIds.push(appt.id);

    // --- OWNER INFORMATION & GET ALL VEHICLES TESTS ---
    console.log('\n[1/7] Testing Owner Information Payload...');
    const reqGet = { user: { id: admin.id, role: 'admin' }, query: {} };
    const resGet = createResMock();
    await vehicleController.getAllVehicles(reqGet, resGet);
    check(resGet.statusCode === 200, 'GET /api/vehicles returned 200');
    
    const vList = resGet.responseData.data;
    check(Array.isArray(vList), 'Response contains data array');
    
    const matchV1 = vList.find(v => v.id === vehicle1.id);
    check(!!matchV1, 'Vehicle 1 returned in list');
    check(matchV1 && matchV1.client_id === client.id, 'client_id present in vehicle item');
    check(matchV1 && !!matchV1.owner, 'owner payload present');
    check(matchV1 && matchV1.owner.id === client.id, 'owner.id matches client.id');
    check(matchV1 && matchV1.owner.name === client.name, 'owner.name matches client.name');
    check(matchV1 && matchV1.owner.email === client.email, 'owner.email matches client.email');
    check(matchV1 && matchV1.owner.phone === client.phone, 'owner.phone matches client.phone');

    // --- SEARCH TESTS ---
    console.log('\n[2/7] Testing Multi-Field Vehicle Search...');
    
    // Search by Make
    const reqSearchMake = { user: { id: admin.id, role: 'admin' }, query: { search: `BrandT4_${ts}` } };
    const resSearchMake = createResMock();
    await vehicleController.getAllVehicles(reqSearchMake, resSearchMake);
    check(resSearchMake.responseData.data.length === 1, 'Search by make returned matching vehicle');

    // Search by Model
    const reqSearchModel = { user: { id: admin.id, role: 'admin' }, query: { search: `ModelX_${ts}` } };
    const resSearchModel = createResMock();
    await vehicleController.getAllVehicles(reqSearchModel, resSearchModel);
    check(resSearchModel.responseData.data.length === 1, 'Search by model returned matching vehicle');

    // Search by License Plate
    const reqSearchPlate = { user: { id: admin.id, role: 'admin' }, query: { search: `T4-PLT-${ts}-1` } };
    const resSearchPlate = createResMock();
    await vehicleController.getAllVehicles(reqSearchPlate, resSearchPlate);
    check(resSearchPlate.responseData.data.length === 1, 'Search by license plate returned matching vehicle');

    // Search by VIN
    const reqSearchVin = { user: { id: admin.id, role: 'admin' }, query: { search: `VIN-T4-1-${ts}` } };
    const resSearchVin = createResMock();
    await vehicleController.getAllVehicles(reqSearchVin, resSearchVin);
    check(resSearchVin.responseData.data.length === 1, 'Search by VIN returned matching vehicle');

    // Search by Owner Name
    const reqSearchOwnerName = { user: { id: admin.id, role: 'admin' }, query: { search: `T4 Client ${ts}` } };
    const resSearchOwnerName = createResMock();
    await vehicleController.getAllVehicles(reqSearchOwnerName, resSearchOwnerName);
    check(resSearchOwnerName.responseData.data.length >= 2, 'Search by owner name returned client vehicles');

    // Search by Owner Email/Phone
    const reqSearchEmail = { user: { id: admin.id, role: 'admin' }, query: { search: `t4_client_${ts}` } };
    const resSearchEmail = createResMock();
    await vehicleController.getAllVehicles(reqSearchEmail, resSearchEmail);
    check(resSearchEmail.responseData.data.length >= 2, 'Search by owner email/phone returned client vehicles');

    // --- PAGINATION & SORTING TESTS ---
    console.log('\n[3/7] Testing Pagination & Sorting...');
    const reqPage = { user: { id: admin.id, role: 'admin' }, query: { page: '1', limit: '1' } };
    const resPage = createResMock();
    await vehicleController.getAllVehicles(reqPage, resPage);
    check(resPage.responseData.data.length === 1, 'Pagination limit respected');
    check(resPage.responseData.pagination.page === 1, 'Pagination page = 1');
    check(resPage.responseData.pagination.limit === 1, 'Pagination limit = 1');
    check(resPage.responseData.pagination.total >= 2, 'Pagination total count accurate');
    check(resPage.responseData.pagination.totalPages >= 2, 'Pagination totalPages count accurate');

    const reqSortInvalid = { user: { id: admin.id, role: 'admin' }, query: { sortBy: 'INVALID_COL; DROP TABLE users;--', sortOrder: 'asc' } };
    const resSortInvalid = createResMock();
    await vehicleController.getAllVehicles(reqSortInvalid, resSortInvalid);
    check(resSortInvalid.statusCode === 200, 'Invalid sort column safely fallback without SQL injection');

    // --- VEHICLE DELETE PERMISSIONS & HISTORICAL PROTECTION ---
    console.log('\n[4/7] Testing Vehicle Deletion & Historical Protection...');

    // 404 Delete
    const reqDel404 = { user: { id: admin.id, role: 'admin' }, params: { id: '99999999' } };
    const resDel404 = createResMock();
    await vehicleController.deleteVehicle(reqDel404, resDel404);
    check(resDel404.statusCode === 404, 'Deleting non-existent vehicle returns 404 Not Found');

    // 409 Conflict Delete (Vehicle with appointments)
    const reqDel409 = { user: { id: admin.id, role: 'admin' }, params: { id: String(vehicleWithHistory.id) } };
    const resDel409 = createResMock();
    await vehicleController.deleteVehicle(reqDel409, resDel409);
    check(resDel409.statusCode === 409, 'Deleting vehicle with appointments returns 409 Conflict');
    check(resDel409.responseData.message.includes('لا يمكن حذف المركبة'), 'Conflict response includes friendly Arabic message');

    const apptCheck = await Appointment.findByPk(appt.id);
    check(!!apptCheck, 'Historical appointment record remains intact');

    // 200 Delete (Vehicle without appointments)
    const reqDel200 = { user: { id: admin.id, role: 'admin' }, params: { id: String(vehicle1.id) } };
    const resDel200 = createResMock();
    await vehicleController.deleteVehicle(reqDel200, resDel200);
    check(resDel200.statusCode === 200, 'Deleting vehicle without history returns 200 OK');

    const v1Check = await Vehicle.findByPk(vehicle1.id);
    check(v1Check === null, 'Vehicle record successfully destroyed');

    // --- AUDIT LOG FOR VEHICLE DELETED ---
    console.log('\n[5/7] Testing VEHICLE_DELETED Audit Trail...');
    const auditDel = await AuditLog.findOne({
      where: { action: 'VEHICLE_DELETED', entity_id: String(vehicle1.id) }
    });
    check(!!auditDel, 'VEHICLE_DELETED audit log entry created');
    check(auditDel && String(auditDel.actor_user_id) === String(admin.id), 'actor_user_id matches authenticated admin ID');
    check(auditDel && !!auditDel.old_values, 'old_values snapshot present');
    if (auditDel) createdAuditLogIds.push(auditDel.id);

    // --- RBAC AUTHORIZATION TESTS FOR DELETE ---
    console.log('\n[6/7] Testing Delete RBAC Restrictions...');
    const vRbac = await Vehicle.create({
      client_id: client.id,
      make: `RbacMake_${ts}`,
      model: `RbacModel_${ts}`,
      license_plate: `RBAC-${ts}`
    });
    createdVehicleIds.push(vRbac.id);

    const reqDelMech = { user: { id: mechanic.id, role: 'mechanic' }, params: { id: String(vRbac.id) } };
    const resDelMech = createResMock();
    await vehicleController.deleteVehicle(reqDelMech, resDelMech);
    check(resDelMech.statusCode === 403, 'Mechanic vehicle deletion rejected with 403 Forbidden');

    const reqDelClient = { user: { id: client.id, role: 'client' }, params: { id: String(vRbac.id) } };
    const resDelClient = createResMock();
    await vehicleController.deleteVehicle(reqDelClient, resDelClient);
    check(resDelClient.statusCode === 403, 'Client vehicle deletion rejected with 403 Forbidden');

    const reqDelSuper = { user: { id: superAdmin.id, role: 'super_admin' }, params: { id: String(vRbac.id) } };
    const resDelSuper = createResMock();
    await vehicleController.deleteVehicle(reqDelSuper, resDelSuper);
    check(resDelSuper.statusCode === 200, 'Super Admin vehicle deletion succeeded with 200 OK');

    // --- REGRESSION TESTS ---
    console.log('\n[7/7] Testing System Security & Audit Log Access Regression...');
    const reqAuditSuper = { user: { id: superAdmin.id, role: 'super_admin' }, query: {} };
    const resAuditSuper = createResMock();
    await auditLogController.getAuditLogs(reqAuditSuper, resAuditSuper);
    check(resAuditSuper.statusCode === 200, 'Audit Log API accessible to Super Admin');

    const reqAuditAdmin = { user: { id: admin.id, role: 'admin' }, query: {} };
    const resAuditAdmin = createResMock();
    await auditLogController.getAuditLogs(reqAuditAdmin, resAuditAdmin);
    check(resAuditAdmin.statusCode === 403, 'Audit Log API forbidden to normal Admin');

  } catch (err) {
    console.error('\n❌ UNEXPECTED TEST ERROR:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP TEMPORARY TEST DATA ---');
    if (createdAppointmentIds.length > 0) {
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
  console.log(`TASK 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTask4Verification();
