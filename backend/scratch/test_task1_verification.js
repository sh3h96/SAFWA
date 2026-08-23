const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User, Appointment, AppointmentMechanic, Vehicle } = require('../models');

const getJwtSecret = () => process.env.JWT_SECRET || 'safwa_secret_key';

async function runTask1Verification() {
  console.log('--- STARTING TASK 1 BACKEND VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✔ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failed++;
    }
  }

  function createResMock() {
    let res = {
      statusCode: 200,
      responseData: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };
    return res;
  }

  try {
    // 1. Verify Database Roles
    const superAdmin = await User.findOne({ where: { email: 'shehabshawgi@gmail.com' } });
    assert(superAdmin && superAdmin.role === 'super_admin', 'Super Admin Shehab exists with role super_admin');

    const receptionist = await User.findOne({ where: { email: 'receptionist@safwa.sa' } });
    assert(receptionist && receptionist.role === 'admin', 'Former receptionist user migrated to admin role');

    // 2. Auth Middleware Test
    const { requireRole } = require('../middleware/auth');
    
    // Super Admin accessing admin route
    let reqSA = { user: { id: superAdmin.id, role: 'super_admin' } };
    let resSA = createResMock();
    let nextCalledSA = false;
    requireRole('admin')(reqSA, resSA, () => { nextCalledSA = true; });
    assert(nextCalledSA, 'requireRole("admin") automatically allows super_admin');

    // Admin accessing super_admin specific action check
    const userController = require('../controllers/userController');
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    assert(!!adminUser, 'Admin user found for testing');

    // Test Admin attempting to suspend Super Admin
    let reqAdminSuspendSA = {
      user: { id: adminUser.id, role: 'admin' },
      params: { id: superAdmin.id }
    };
    let resMock1 = createResMock();
    await userController.updateUserStatus(reqAdminSuspendSA, resMock1);
    assert(resMock1.statusCode === 403, 'Normal Admin suspended Super Admin attempt rejected with 403');

    // Test Admin attempting to create another Admin
    let reqAdminCreateAdmin = {
      user: { id: adminUser.id, role: 'admin' },
      body: { name: 'Fake Admin', email: 'fake_admin_test@safwa.sa', role: 'admin', password: 'password123' }
    };
    let resMock2 = createResMock();
    await userController.createUser(reqAdminCreateAdmin, resMock2);
    assert(resMock2.statusCode === 403, 'Normal Admin creating Admin attempt rejected with 403');

    // Test Super Admin creating an Admin
    const testAdminEmail = `test_admin_${Date.now()}@safwa.sa`;
    let reqSACreateAdmin = {
      user: { id: superAdmin.id, role: 'super_admin' },
      body: { name: 'New Staff Admin', email: testAdminEmail, role: 'admin', password: 'password123' }
    };
    let resMock3 = createResMock();
    await userController.createUser(reqSACreateAdmin, resMock3);
    assert(resMock3.statusCode === 201, 'Super Admin can successfully create an Admin account');
    
    // Clean up test admin
    await User.destroy({ where: { email: testAdminEmail } });

    // 3. Multi-Mechanic Appointment Test
    const mechanics = await User.findAll({ where: { role: 'mechanic' }, limit: 2 });
    assert(mechanics.length >= 2, 'Found at least 2 mechanics for multi-mechanic assignment testing');

    const appointment = await Appointment.findOne();
    assert(!!appointment, 'Found an existing appointment for multi-mechanic test');

    const appointmentController = require('../controllers/appointmentController');
    let reqAssignMulti = {
      user: { id: superAdmin.id, role: 'super_admin' },
      params: { id: appointment.id },
      body: { mechanic_ids: mechanics.map(m => m.id) }
    };
    let resMock4 = createResMock();
    await appointmentController.updateAppointment(reqAssignMulti, resMock4);
    assert(resMock4.statusCode === 200, 'Super Admin assigned multiple mechanics successfully');

    const assignedMechanicsCount = await AppointmentMechanic.count({ where: { appointment_id: appointment.id } });
    assert(assignedMechanicsCount === mechanics.length, `appointment_mechanics table populated with ${mechanics.length} mechanic entries`);

    // Verify assigned mechanics can fetch tasks
    let reqMechTasks = { user: { id: mechanics[0].id, role: 'mechanic' } };
    let resMock5 = createResMock();
    await appointmentController.getAssignedTasks(reqMechTasks, resMock5);
    const tasksData = resMock5.responseData;
    assert(Array.isArray(tasksData) && tasksData.some(t => t.appointment_id === appointment.id), 'Assigned mechanic successfully retrieved multi-assigned appointment');

    console.log(`\n--- VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Verification error:', err);
    process.exit(1);
  }
}

runTask1Verification();
