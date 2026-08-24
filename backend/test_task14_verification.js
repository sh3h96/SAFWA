'use strict';

const { User, AuditLog } = require('./models');
const bcrypt = require('bcrypt');
const userController = require('./controllers/userController');

function createResMock() {
  return {
    statusCode: 200,
    responseData: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; }
  };
}

let testSuperAdmin, testAdmin1, testAdmin2, testClient1, testClient2;
const createdUserIds = [];

async function setupTestData() {
  console.log('--- SETTING UP TASK 14 TEST DATA ---');
  const ts = Date.now();
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  testSuperAdmin = await User.create({
    name: `T14 SuperAdmin ${ts}`,
    email: `t14_superadmin_${ts}@safwa.test`,
    password: hashedPassword,
    role: 'super_admin',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testSuperAdmin.id);

  testAdmin1 = await User.create({
    name: `T14 Admin1 ${ts}`,
    email: `t14_admin1_${ts}@safwa.test`,
    password: hashedPassword,
    role: 'admin',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testAdmin1.id);

  testAdmin2 = await User.create({
    name: `T14 Admin2 ${ts}`,
    email: `t14_admin2_${ts}@safwa.test`,
    password: hashedPassword,
    role: 'admin',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testAdmin2.id);

  testClient1 = await User.create({
    name: `T14 Client1 ${ts}`,
    email: `t14_client1_${ts}@safwa.test`,
    password: hashedPassword,
    role: 'client',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testClient1.id);

  testClient2 = await User.create({
    name: `T14 Client2 ${ts}`,
    email: `t14_client2_${ts}@safwa.test`,
    password: hashedPassword,
    role: 'client',
    status: 'active',
    is_email_verified: true,
    token_version: 0
  });
  createdUserIds.push(testClient2.id);
}

async function cleanupTestData() {
  console.log('--- CLEANING UP TASK 14 TEST DATA ---');
  try {
    if (createdUserIds.length > 0) {
      await AuditLog.destroy({
        where: {
          entity_type: 'User',
          entity_id: createdUserIds.map(String)
        }
      });
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
    const ts = Date.now();

    console.log('\n=== SAFWA TASK 14 VERIFICATION TESTS ===\n');

    // 1. Super Admin Immutability: Normal admin editing Super Admin account (403)
    {
      const req = {
        user: { id: testAdmin1.id, role: 'admin' },
        params: { id: String(testSuperAdmin.id) },
        body: { name: 'Hacked Super Admin' }
      };
      const res = createResMock();
      await userController.updateUser(req, res);
      assert(res.statusCode === 403, 'Normal Admin cannot edit Super Admin account (403 Forbidden)');
    }

    // 2. Super Admin Immutability: Normal admin suspending Super Admin account (403)
    {
      const req = {
        user: { id: testAdmin1.id, role: 'admin' },
        params: { id: String(testSuperAdmin.id) }
      };
      const res = createResMock();
      await userController.updateUserStatus(req, res);
      assert(res.statusCode === 403, 'Normal Admin cannot suspend Super Admin account (403 Forbidden)');
    }

    // 3. Super Admin Immutability: Attempting to remove super_admin role (403)
    {
      const req = {
        user: { id: testSuperAdmin.id, role: 'super_admin' },
        params: { id: String(testSuperAdmin.id) },
        body: { role: 'admin' }
      };
      const res = createResMock();
      await userController.updateUser(req, res);
      assert(res.statusCode === 403, 'Cannot demote or remove super_admin role (403 Forbidden)');
    }

    // 4. Super Admin Immutability: Creating new super_admin account blocked for all (403)
    {
      const req = {
        user: { id: testSuperAdmin.id, role: 'super_admin' },
        body: { name: 'New Super', email: `newsuper_${ts}@safwa.test`, password: 'Password123!', role: 'super_admin' }
      };
      const res = createResMock();
      await userController.createUser(req, res);
      assert(res.statusCode === 403, 'Creating a new super_admin account is blocked (403 Forbidden)');
    }

    // 5. Admin Hierarchy: Normal admin creating Admin account (403)
    {
      const req = {
        user: { id: testAdmin1.id, role: 'admin' },
        body: { name: 'Admin By Admin', email: `adminbyadmin_${ts}@safwa.test`, password: 'Password123!', role: 'admin' }
      };
      const res = createResMock();
      await userController.createUser(req, res);
      assert(res.statusCode === 403, 'Normal Admin cannot create Admin account (403 Forbidden)');
    }

    // 6. Admin Hierarchy: Normal admin editing another Admin account (403)
    {
      const req = {
        user: { id: testAdmin1.id, role: 'admin' },
        params: { id: String(testAdmin2.id) },
        body: { name: 'Renamed Admin 2' }
      };
      const res = createResMock();
      await userController.updateUser(req, res);
      assert(res.statusCode === 403, 'Normal Admin cannot edit another Admin account (403 Forbidden)');
    }

    // 7. Admin Hierarchy: Normal admin suspending another Admin account (403)
    {
      const req = {
        user: { id: testAdmin1.id, role: 'admin' },
        params: { id: String(testAdmin2.id) }
      };
      const res = createResMock();
      await userController.updateUserStatus(req, res);
      assert(res.statusCode === 403, 'Normal Admin cannot suspend another Admin account (403 Forbidden)');
    }

    // 8. Admin Hierarchy: Normal admin promoting client to Admin (403)
    {
      const req = {
        user: { id: testAdmin1.id, role: 'admin' },
        params: { id: String(testClient1.id) },
        body: { role: 'admin' }
      };
      const res = createResMock();
      await userController.updateUser(req, res);
      assert(res.statusCode === 403, 'Normal Admin cannot promote user to Admin (403 Forbidden)');
    }

    // 9. Super Admin Hierarchy: Super Admin creating Admin account (201)
    let createdAdminBySuper;
    {
      const req = {
        user: { id: testSuperAdmin.id, role: 'super_admin' },
        body: { name: `Admin By Super ${ts}`, email: `adminbysuper_${ts}@safwa.test`, password: 'Password123!', role: 'admin' }
      };
      const res = createResMock();
      await userController.createUser(req, res);
      assert(res.statusCode === 201 && res.responseData.id, 'Super Admin can create Admin account (201 Created)');
      createdAdminBySuper = res.responseData;
      if (createdAdminBySuper && createdAdminBySuper.id) {
        createdUserIds.push(createdAdminBySuper.id);
      }
    }

    // 10. Super Admin Hierarchy: Super Admin editing another Admin account (200)
    {
      const req = {
        user: { id: testSuperAdmin.id, role: 'super_admin' },
        params: { id: String(testAdmin2.id) },
        body: { name: `Renamed Admin 2 By Super ${ts}` }
      };
      const res = createResMock();
      await userController.updateUser(req, res);
      assert(res.statusCode === 200 && res.responseData.name.includes('Renamed Admin 2 By Super'), 'Super Admin can edit Admin account (200 OK)');
    }

    // 11. Super Admin Hierarchy: Super Admin suspending Admin account (200)
    {
      const req = {
        user: { id: testSuperAdmin.id, role: 'super_admin' },
        params: { id: String(testAdmin2.id) }
      };
      const res = createResMock();
      await userController.updateUserStatus(req, res);
      assert(res.statusCode === 200 && res.responseData.status === 'suspended', 'Super Admin can suspend Admin account (200 OK)');
    }

    // 12. Self-Modification: User attempting to change own role (403)
    {
      const req = {
        user: { id: testAdmin1.id, role: 'admin' },
        params: { id: String(testAdmin1.id) },
        body: { role: 'super_admin' }
      };
      const res = createResMock();
      await userController.updateUser(req, res);
      assert(res.statusCode === 403, 'User cannot change own role (403 Forbidden)');
    }

    // 13. Self-Modification: User attempting to suspend own status (403)
    {
      const req = {
        user: { id: testAdmin1.id, role: 'admin' },
        params: { id: String(testAdmin1.id) }
      };
      const res = createResMock();
      await userController.updateUserStatus(req, res);
      assert(res.statusCode === 403, 'User cannot suspend own account (403 Forbidden)');
    }

    // 14. Profile Update: Authenticated user updating own name and phone (200)
    {
      const req = {
        user: { id: testClient1.id, role: 'client' },
        body: { name: 'Updated Client Name', phone: '0599999999' }
      };
      const res = createResMock();
      await userController.updateProfile(req, res);
      assert(res.statusCode === 200 && res.responseData.name === 'Updated Client Name' && res.responseData.phone === '0599999999', 'Authenticated user can update own profile (200 OK)');
      assert(res.responseData.password === undefined, 'Returned profile payload is sanitized without password');
    }

    // 15. Change Password: Wrong current password (400)
    {
      const req = {
        user: { id: testClient1.id, role: 'client' },
        body: { currentPassword: 'WrongPassword123', newPassword: 'NewPassword123!' }
      };
      const res = createResMock();
      await userController.changePassword(req, res);
      assert(res.statusCode === 400, 'Password change with wrong current password rejected (400 Bad Request)');
    }

    // 16. Change Password: Valid current password (200)
    {
      const req = {
        user: { id: testClient1.id, role: 'client' },
        body: { currentPassword: 'Password123!', newPassword: 'NewPassword123!' }
      };
      const res = createResMock();
      await userController.changePassword(req, res);
      assert(res.statusCode === 200, 'Password change with valid current password succeeds (200 OK)');

      const updatedClient = await User.findByPk(testClient1.id);
      const isPassUpdated = await bcrypt.compare('NewPassword123!', updatedClient.password);
      assert(isPassUpdated, 'Password updated and hashed properly in database');
    }

    // 17. Audit Log Verification
    {
      const auditBlocked = await AuditLog.findOne({
        where: {
          action: 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED'
        }
      });
      assert(auditBlocked !== null, 'SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED audit log recorded');

      const auditProfile = await AuditLog.findOne({
        where: {
          action: 'USER_PROFILE_UPDATED',
          entity_id: String(testClient1.id)
        }
      });
      assert(auditProfile !== null, 'USER_PROFILE_UPDATED audit log recorded');

      const auditPassword = await AuditLog.findOne({
        where: {
          action: 'AUTH_PASSWORD_CHANGED',
          entity_id: String(testClient1.id)
        }
      });
      assert(auditPassword !== null, 'AUTH_PASSWORD_CHANGED audit log recorded');
    }

  } catch (globalErr) {
    console.error('Global verification test error:', globalErr);
  } finally {
    await cleanupTestData();

    console.log('\n======================================');
    console.log(`TASK 14 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================\n');
    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

runTests();
