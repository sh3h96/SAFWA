const jwt = require('jsonwebtoken');
const { sequelize, User, Vehicle, Appointment, AppointmentMechanic, AuditLog } = require('./models');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'safwa-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTask17Verification() {
  console.log('==================================================');
  console.log('STARTING TASK 17 VERIFICATION SUITE');
  console.log('==================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${message}`);
    }
  }

  try {
    await sequelize.authenticate();

    // 1. Setup Test Users
    let client1 = await User.findOne({ where: { role: 'client' } });
    if (!client1) {
      client1 = await User.create({
        name: 'Task17 Client 1',
        email: 't17client1@test.com',
        phone: '0501111111',
        password: 'password123',
        password_hash: 'hash',
        role: 'client',
        status: 'active'
      });
    }

    let client2 = await User.findOne({ where: { id: { [Op.ne]: client1.id }, role: 'client' } });
    if (!client2) {
      client2 = await User.create({
        name: 'Task17 Client 2',
        email: 't17client2@test.com',
        phone: '0502222222',
        password: 'password123',
        password_hash: 'hash',
        role: 'client',
        status: 'active'
      });
    }

    let mech1 = await User.findOne({ where: { role: 'mechanic' } });
    if (!mech1) {
      mech1 = await User.create({
        name: 'Task17 Mech 1',
        email: 't17mech1@test.com',
        phone: '0503333333',
        password: 'password123',
        password_hash: 'hash',
        role: 'mechanic',
        status: 'active'
      });
    }

    let mech2 = await User.findOne({ where: { id: { [Op.ne]: mech1.id }, role: 'mechanic' } });
    if (!mech2) {
      mech2 = await User.create({
        name: 'Task17 Mech 2',
        email: 't17mech2@test.com',
        phone: '0504444444',
        password: 'password123',
        password_hash: 'hash',
        role: 'mechanic',
        status: 'active'
      });
    }

    let admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      admin = await User.create({
        name: 'Task17 Admin',
        email: 't17admin@test.com',
        phone: '0505555555',
        password: 'password123',
        password_hash: 'hash',
        role: 'admin',
        status: 'active'
      });
    }

    // 2. Setup Test Vehicles
    let vehicle1 = await Vehicle.findOne({ where: { client_id: client1.id } });
    if (!vehicle1) {
      vehicle1 = await Vehicle.create({
        client_id: client1.id,
        make: 'Toyota',
        model: 'Camry 2022',
        license_plate: 'T17-CAM1'
      });
    }

    let vehicle2 = await Vehicle.findOne({ where: { client_id: client2.id } });
    if (!vehicle2) {
      vehicle2 = await Vehicle.create({
        client_id: client2.id,
        make: 'Honda',
        model: 'Accord 2023',
        license_plate: 'T17-ACC2'
      });
    }

    const appController = require('./controllers/appointmentController');

    // Helper express req/res mock creator
    function createMockReqRes(user, body = {}, params = {}, query = {}) {
      const req = {
        user,
        body,
        params,
        query,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' }
      };
      let resStatus = 200;
      let resJson = null;

      const res = {
        status: (code) => {
          resStatus = code;
          return res;
        },
        json: (data) => {
          resJson = data;
          return res;
        }
      };

      return { req, res, getResult: () => ({ status: resStatus, data: resJson }) };
    }

    // TEST 1: Client creates appointment for own vehicle -> 201 Created
    {
      const { req, res, getResult } = createMockReqRes(client1, {
        vehicle_id: vehicle1.id,
        description: 'صيانة دورية فرامل'
      });
      await appController.createAppointment(req, res);
      const res1 = getResult();
      assert(res1.status === 201 && res1.data.appointment.status === 'pending', 'Client creates appointment for own vehicle successfully (201 Created)');
      var createdApp1 = res1.data.appointment;
    }

    // TEST 2: Client creates appointment for another client's vehicle -> 404 Not Found
    {
      const { req, res, getResult } = createMockReqRes(client1, {
        vehicle_id: vehicle2.id,
        description: 'محاولة اختراق مركبة عميل آخر'
      });
      await appController.createAppointment(req, res);
      const res2 = getResult();
      assert(res2.status === 404, 'Client booking for another client vehicle is rejected (404 Not Found)');
    }

    // TEST 3: Client attempts to set mechanic_id -> 400 Bad Request
    {
      const { req, res, getResult } = createMockReqRes(client1, {
        vehicle_id: vehicle1.id,
        description: 'محاولة تحديد ميكانيكي',
        mechanic_id: mech1.id
      });
      await appController.createAppointment(req, res);
      const res3 = getResult();
      assert(res3.status === 400, 'Client setting mechanic_id during booking is rejected (400 Bad Request)');
    }

    // TEST 4: Client attempts to set mechanic_ids -> 400 Bad Request
    {
      const { req, res, getResult } = createMockReqRes(client1, {
        vehicle_id: vehicle1.id,
        description: 'محاولة تحديد مجموعة ميكانيكيين',
        mechanic_ids: [mech1.id, mech2.id]
      });
      await appController.createAppointment(req, res);
      const res4 = getResult();
      assert(res4.status === 400, 'Client setting mechanic_ids during booking is rejected (400 Bad Request)');
    }

    // TEST 5: Client attempts to set status -> 400 Bad Request
    {
      const { req, res, getResult } = createMockReqRes(client1, {
        vehicle_id: vehicle1.id,
        description: 'محاولة تغيير الحالة مباشرة',
        status: 'completed'
      });
      await appController.createAppointment(req, res);
      const res5 = getResult();
      assert(res5.status === 400, 'Client setting status during booking is rejected (400 Bad Request)');
    }

    // TEST 6: Mechanic attempts to assign another mechanic -> 400 Bad Request
    {
      // First let's assign mech1 to createdApp1 so mech1 has access to appointment
      await AppointmentMechanic.create({ appointment_id: createdApp1.id, mechanic_id: mech1.id });
      
      const { req, res, getResult } = createMockReqRes(mech1, {
        mechanic_ids: [mech1.id, mech2.id]
      }, { id: createdApp1.id });
      await appController.updateAppointment(req, res);
      const res6 = getResult();
      assert(res6.status === 400, 'Mechanic attempting to assign mechanics is rejected (400 Bad Request)');
    }

    // TEST 7: Mechanic attempts to modify restricted fields -> 400 Bad Request
    {
      const { req, res, getResult } = createMockReqRes(mech1, {
        problem_description: 'تغيير الوصف من الفني'
      }, { id: createdApp1.id });
      await appController.updateAppointment(req, res);
      const res7 = getResult();
      assert(res7.status === 400, 'Mechanic modifying restricted fields is rejected (400 Bad Request)');
    }

    // TEST 8: Admin assigns valid single mechanic -> 200 OK
    {
      const { req, res, getResult } = createMockReqRes(admin, {
        mechanic_id: mech1.id,
        status: 'under_inspection'
      }, { id: createdApp1.id });
      await appController.updateAppointment(req, res);
      const res8 = getResult();
      assert(res8.status === 200, 'Admin assigns single valid mechanic successfully (200 OK)');
    }

    // TEST 9: Admin assigns multiple valid mechanics -> 200 OK
    {
      const { req, res, getResult } = createMockReqRes(admin, {
        mechanic_ids: [mech1.id, mech2.id]
      }, { id: createdApp1.id });
      await appController.updateAppointment(req, res);
      const res9 = getResult();
      const ams = await AppointmentMechanic.findAll({ where: { appointment_id: createdApp1.id } });
      assert(res9.status === 200 && ams.length === 2, 'Admin assigns multi-mechanics successfully and junction table reflects count (200 OK)');
    }

    // TEST 10: Admin attempts to assign non-mechanic user -> 400 Bad Request
    {
      const { req, res, getResult } = createMockReqRes(admin, {
        mechanic_ids: [client1.id]
      }, { id: createdApp1.id });
      await appController.updateAppointment(req, res);
      const res10 = getResult();
      assert(res10.status === 400, 'Admin assigning non-mechanic user is rejected (400 Bad Request)');
    }

    // TEST 11: Unassigned mechanic cannot access appointment details -> 404 Not Found
    {
      let unassignedMech = await User.create({
        name: 'Task17 Unassigned Mech',
        email: `unassignedmech${Date.now()}@test.com`,
        phone: '0509999999',
        password: 'password123',
        password_hash: 'hash',
        role: 'mechanic',
        status: 'active'
      });

      const { req, res, getResult } = createMockReqRes(unassignedMech, {}, { id: createdApp1.id });
      await appController.getAppointmentById(req, res);
      const res11 = getResult();
      assert(res11.status === 404, 'Unassigned mechanic cannot access appointment details (404 Not Found)');

      await unassignedMech.destroy();
    }

    // TEST 12: Assigned mechanic can access appointment details -> 200 OK
    {
      const { req, res, getResult } = createMockReqRes(mech1, {}, { id: createdApp1.id });
      await appController.getAppointmentById(req, res);
      const res12 = getResult();
      assert(res12.status === 200 && res12.data.id === createdApp1.id, 'Assigned mechanic accesses appointment details successfully (200 OK)');
    }

    // TEST 13: Client can view only their own appointments -> 404 Not Found for other client's appointment
    {
      const { req, res, getResult } = createMockReqRes(client2, {}, { id: createdApp1.id });
      await appController.getAppointmentById(req, res);
      const res13 = getResult();
      assert(res13.status === 404, 'Client viewing another client appointment is rejected (404 Not Found)');
    }

    // TEST 14: Invalid status transition -> 400 Bad Request
    {
      // Attempt to move from under_inspection directly back to pending or completed without going through flow
      const { req, res, getResult } = createMockReqRes(admin, {
        status: 'pending'
      }, { id: createdApp1.id });
      await appController.updateAppointment(req, res);
      const res14 = getResult();
      assert(res14.status === 400, 'Invalid status transition is rejected by backend state machine (400 Bad Request)');
    }

    // TEST 15: Audit Actor comes from JWT token -> Audit log check
    {
      const latestAudit = await AuditLog.findOne({
        where: { entity_type: 'Appointment', entity_id: createdApp1.id },
        order: [['created_at', 'DESC']]
      });
      assert(latestAudit && (latestAudit.actor_user_id === admin.id || latestAudit.actor_user_id === client1.id), 'Audit log records actor ID directly from authenticated user');
    }

    console.log('\n==================================================');
    console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('==================================================\n');

    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (error) {
    console.error('VERIFICATION ERROR:', error);
    process.exit(1);
  }
}

runTask17Verification();
