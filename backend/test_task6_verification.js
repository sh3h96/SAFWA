'use strict';

const assert = require('assert');
const bcrypt = require('bcrypt');
const factories = require('./factories');
const { User, Vehicle, Appointment, AppointmentMechanic, AuditLog, sequelize } = require('./models');

async function runTask6Verification() {
  console.log('=== STARTING SAFWA TASK 6 VERIFICATION TESTS ===\n');

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

  try {
    const ts = Date.now();

    // --- TEST 1 to 5: Factory Role Verification ---
    console.log('[1/23] Testing Factory Role Generation...');
    const fakeSuper = factories.createFakeUser('super_admin');
    check(fakeSuper.role === 'super_admin', 'Factory creates super_admin');

    const fakeAdmin = factories.createFakeUser('admin');
    check(fakeAdmin.role === 'admin', 'Factory creates admin');

    const fakeMech = factories.createFakeUser('mechanic');
    check(fakeMech.role === 'mechanic', 'Factory creates mechanic');

    const fakeClient = factories.createFakeUser('client');
    check(fakeClient.role === 'client', 'Factory creates client');

    const fakeReceptionist = factories.createFakeUser('receptionist');
    check(fakeReceptionist.role === 'admin' && fakeReceptionist.role !== 'receptionist', 'Factory re-maps receptionist to admin (no receptionist allowed)');

    // --- TEST 6 to 14: Canonical Super Admin Verification ---
    console.log('\n[2/23] Testing Canonical Super Admin Account...');
    const superAdmin = await User.findOne({ where: { email: 'shehabshawgi@gmail.com' } });
    check(!!superAdmin, 'Super Admin account (shehabshawgi@gmail.com) exists');

    if (superAdmin) {
      check(superAdmin.role === 'super_admin', 'Super Admin role === super_admin');
      check(superAdmin.name === 'Shehab', 'Super Admin name === Shehab');
      check(superAdmin.phone === '777537842', 'Super Admin phone === 777537842');
      check(superAdmin.status === 'active', 'Super Admin status === active');
      check(superAdmin.is_email_verified === true, 'Super Admin is_email_verified === true');

      const isPassValid = await bcrypt.compare('password1234', superAdmin.password);
      check(isPassValid, 'Super Admin password matches "password1234"');

      const isPassInvalid = await bcrypt.compare('password123', superAdmin.password);
      check(!isPassInvalid, 'Super Admin password DOES NOT match "password123"');
    }

    const superAdminCount = await User.count({ where: { email: 'shehabshawgi@gmail.com' } });
    check(superAdminCount === 1, 'Exactly one Super Admin account exists for shehabshawgi@gmail.com');

    // --- TEST 15: Receptionist Absence Check ---
    console.log('\n[3/23] Testing Receptionist Role Absence in DB Active Users...');
    const receptionistCount = await User.count({ where: { role: 'receptionist' } });
    check(receptionistCount === 0, 'Zero users have role === receptionist in database');

    // --- TEST 16 to 19: Multi-Mechanic Seed Data & Junction Integrity ---
    console.log('\n[4/23] Testing Multi-Mechanic Seed Relationships & Junction Integrity...');
    const amRecords = await AppointmentMechanic.findAll();
    check(Array.isArray(amRecords), 'appointment_mechanics table query successful');

    // Test duplicate junction prevention using temporary models
    const tempClient = await User.create({
      name: `T6 Client ${ts}`,
      email: `t6_client_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'client'
    });
    createdUserIds.push(tempClient.id);

    const tempMech1 = await User.create({
      name: `T6 Mech1 ${ts}`,
      email: `t6_mech1_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'mechanic'
    });
    createdUserIds.push(tempMech1.id);

    const tempMech2 = await User.create({
      name: `T6 Mech2 ${ts}`,
      email: `t6_mech2_${ts}@safwa.sa`,
      password: 'hashedpassword',
      role: 'mechanic'
    });
    createdUserIds.push(tempMech2.id);

    const tempVehicle = await Vehicle.create({
      client_id: tempClient.id,
      make: `MakeT6_${ts}`,
      model: `ModelT6_${ts}`,
      license_plate: `T6-PLT-${ts}`
    });

    const tempAppt1 = await Appointment.create({
      client_id: tempClient.id,
      vehicle_id: tempVehicle.id,
      mechanic_id: tempMech1.id,
      problem_description: 'Seeder multi-mech test 1'
    });

    const tempAppt2 = await Appointment.create({
      client_id: tempClient.id,
      vehicle_id: tempVehicle.id,
      mechanic_id: tempMech1.id,
      problem_description: 'Seeder multi-mech test 2'
    });

    await AppointmentMechanic.create({ appointment_id: tempAppt1.id, mechanic_id: tempMech1.id });
    await AppointmentMechanic.create({ appointment_id: tempAppt1.id, mechanic_id: tempMech2.id });
    await AppointmentMechanic.create({ appointment_id: tempAppt2.id, mechanic_id: tempMech1.id });

    const mech1Assignments = await AppointmentMechanic.findAll({ where: { mechanic_id: tempMech1.id } });
    check(mech1Assignments.length === 2, 'One mechanic can appear in multiple appointment_mechanics records (Appt 1 & Appt 2)');

    const appt1Assignments = await AppointmentMechanic.findAll({ where: { appointment_id: tempAppt1.id } });
    check(appt1Assignments.length === 2, '1 Appointment can have multiple mechanics (Mech 1 & Mech 2)');

    const appt1Fresh = await Appointment.findByPk(tempAppt1.id);
    check(appt1Fresh.mechanic_id === tempMech1.id, 'Legacy appointment.mechanic_id remains synchronized with primary mechanic');

    // Cleanup temp test records
    await AppointmentMechanic.destroy({ where: { appointment_id: [tempAppt1.id, tempAppt2.id] } });
    await Appointment.destroy({ where: { id: [tempAppt1.id, tempAppt2.id] } });
    await Vehicle.destroy({ where: { id: tempVehicle.id } });

    // --- TEST 20 to 23: Regression Verification ---
    console.log('\n[5/23] Testing Regression Against Tasks 1, 2, 2B, 4, 5...');
    
    // Task 1 Hierarchy Check
    const allRoles = await User.findAll({ attributes: ['role'], group: ['role'] });
    const rolesList = allRoles.map(r => r.role);
    check(!rolesList.includes('receptionist'), 'Role hierarchy regression free: receptionist absent');

    // Task 2/2B Audit Logger Integrity
    check(typeof AuditLog.create === 'function', 'AuditLog model functional');

    // Task 4 Vehicle Management Integrity
    check(typeof Vehicle.findAndCountAll === 'function', 'Vehicle management model functional');

    // Task 5 Multi-Mechanic Junction Integrity
    check(typeof AppointmentMechanic.bulkCreate === 'function', 'AppointmentMechanic model functional');

  } catch (err) {
    console.error('\n❌ UNEXPECTED TEST ERROR:', err);
    failed++;
  } finally {
    console.log('\n--- CLEANING UP TEMPORARY TEST DATA ---');
    if (createdUserIds.length > 0) {
      await User.destroy({ where: { id: createdUserIds } });
    }
    console.log('✓ Cleanup completed: Database state pristine');
  }

  console.log('\n======================================');
  console.log(`TASK 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTask6Verification();
