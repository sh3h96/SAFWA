const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User, AuditLog, Appointment, Review, sequelize } = require('./models');
const userController = require('./controllers/userController');
const reviewController = require('./controllers/reviewController');

function createResMock() {
  return {
    statusCode: 200,
    responseData: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.responseData = data; return this; }
  };
}

async function runTask2BSafeVerification() {
  console.log('=== STARTING TASK 2B SAFE NON-DESTRUCTIVE VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failed++;
    }
  }

  let tempUser = null;
  let tempAppt = null;

  try {
    // 1. Verify Super Admin Password State
    console.log('[1/7] Verifying Super Admin Password Restoration...');
    const superAdmin = await User.findOne({ where: { role: 'super_admin' } });
    assert(!!superAdmin, 'Super Admin account exists');
    
    const isPassword1234 = await bcrypt.compare('password1234', superAdmin.password);
    const isPassword123 = await bcrypt.compare('password123', superAdmin.password);
    
    assert(isPassword1234 === true, 'Super Admin password matches password1234');
    assert(isPassword123 === false, 'Super Admin password DOES NOT match password123');

    // Create temporary test user for isolated audit event tests
    const tempEmail = `temp_audit_test_${Date.now()}@safwa.sa`;
    tempUser = await User.create({
      name: 'Temp Audit Tester',
      email: tempEmail,
      password: await bcrypt.hash('password123', 10),
      role: 'client',
      phone: '0500000099',
      is_email_verified: false
    });

    // 2. Verify AUTH_LOGOUT Audit Event
    console.log('\n[2/7] Verifying AUTH_LOGOUT Audit Event...');
    const reqLogout = { user: { id: tempUser.id }, ip: '127.0.0.1', headers: {} };
    const resLogout = createResMock();
    await userController.logout(reqLogout, resLogout);
    assert(resLogout.statusCode === 200, 'Logout handler succeeded');

    const logoutLog = await AuditLog.findOne({
      where: { action: 'AUTH_LOGOUT', actor_user_id: tempUser.id },
      order: [['created_at', 'DESC']]
    });
    assert(!!logoutLog, 'AUTH_LOGOUT audit log recorded');
    assert(logoutLog && logoutLog.entity_type === 'User' && String(logoutLog.entity_id) === String(tempUser.id), 'AUTH_LOGOUT target entity matches logged in user ID');
    assert(logoutLog && logoutLog.actor_user_id === tempUser.id, 'AUTH_LOGOUT actor_user_id strictly matches req.user.id');

    // 3. Verify AUTH_PASSWORD_RESET_REQUEST Audit Event
    console.log('\n[3/7] Verifying AUTH_PASSWORD_RESET_REQUEST Audit Event...');
    const reqResetReq = { body: { email: tempEmail }, ip: '127.0.0.1', headers: {} };
    const resResetReq = createResMock();
    await userController.forgotPassword(reqResetReq, resResetReq);
    assert(resResetReq.statusCode === 200, 'ForgotPassword handler succeeded');

    const resetReqLog = await AuditLog.findOne({
      where: { action: 'AUTH_PASSWORD_RESET_REQUEST', entity_id: String(tempUser.id) },
      order: [['created_at', 'DESC']]
    });
    assert(!!resetReqLog, 'AUTH_PASSWORD_RESET_REQUEST audit log recorded');
    assert(resetReqLog && resetReqLog.actor_user_id === null, 'Unauthenticated password reset request has actor_user_id = null');

    // 4. Verify AUTH_PASSWORD_RESET_SUCCESS Audit Event
    console.log('\n[4/7] Verifying AUTH_PASSWORD_RESET_SUCCESS Audit Event...');
    const rawResetToken = 'safe_test_token_' + Date.now();
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    
    await tempUser.update({
      reset_token_hash: hashedResetToken,
      reset_token_expires_at: new Date(Date.now() + 3600000)
    });

    const reqResetSuccess = { body: { token: rawResetToken, newPassword: 'newPassword123' }, query: {}, ip: '127.0.0.1', headers: {} };
    const resResetSuccess = createResMock();
    await userController.resetPassword(reqResetSuccess, resResetSuccess);
    assert(resResetSuccess.statusCode === 200, 'ResetPassword handler succeeded');

    const resetSuccessLog = await AuditLog.findOne({
      where: { action: 'AUTH_PASSWORD_RESET_SUCCESS', entity_id: String(tempUser.id) },
      order: [['created_at', 'DESC']]
    });
    assert(!!resetSuccessLog, 'AUTH_PASSWORD_RESET_SUCCESS audit log recorded');
    assert(resetSuccessLog && String(resetSuccessLog.entity_id) === String(tempUser.id), 'AUTH_PASSWORD_RESET_SUCCESS entity_id matches reset user');

    // 5. Verify AUTH_EMAIL_VERIFIED Audit Event
    console.log('\n[5/7] Verifying AUTH_EMAIL_VERIFIED Audit Event...');
    const rawVerifyToken = 'safe_verify_token_' + Date.now();
    const hashedVerifyToken = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');
    
    await tempUser.update({
      verification_token_hash: hashedVerifyToken,
      verification_token_expires_at: new Date(Date.now() + 3600000)
    });

    const reqVerify = { body: { token: rawVerifyToken }, query: {}, ip: '127.0.0.1', headers: {} };
    const resVerify = createResMock();
    await userController.verifyEmail(reqVerify, resVerify);
    assert(resVerify.statusCode === 200, 'VerifyEmail handler succeeded');

    const verifyLog = await AuditLog.findOne({
      where: { action: 'AUTH_EMAIL_VERIFIED', entity_id: String(tempUser.id) },
      order: [['created_at', 'DESC']]
    });
    assert(!!verifyLog, 'AUTH_EMAIL_VERIFIED audit log recorded');
    assert(verifyLog && String(verifyLog.entity_id) === String(tempUser.id), 'AUTH_EMAIL_VERIFIED entity_id matches verified user');

    // 6. Verify REVIEW_CREATED Audit Event
    console.log('\n[6/7] Verifying REVIEW_CREATED Audit Event...');
    const existingVehicle = await sequelize.query(`SELECT id FROM vehicles LIMIT 1;`, { type: sequelize.QueryTypes.SELECT });
    const vehicleId = existingVehicle.length > 0 ? existingVehicle[0].id : null;

    tempAppt = await Appointment.create({
      client_id: tempUser.id,
      vehicle_id: vehicleId,
      problem_description: 'Audit Review Test',
      status: 'completed',
      scheduled_date: new Date()
    });

    const reqReview = {
      user: { id: tempUser.id, role: 'client' },
      body: { appointment_id: tempAppt.id, rating: 5, comment: 'خدمة راقية جدا' },
      ip: '127.0.0.1',
      headers: {}
    };
    const resReview = createResMock();
    await reviewController.createReview(reqReview, resReview);
    assert(resReview.statusCode === 201, 'CreateReview handler succeeded');

    const reviewLog = await AuditLog.findOne({
      where: { action: 'REVIEW_CREATED', actor_user_id: tempUser.id },
      order: [['created_at', 'DESC']]
    });
    assert(!!reviewLog, 'REVIEW_CREATED audit log recorded');
    assert(reviewLog && reviewLog.entity_type === 'Review', 'REVIEW_CREATED entity_type is Review');
    assert(reviewLog && reviewLog.actor_user_id === tempUser.id, 'REVIEW_CREATED actor_user_id matches authenticated client ID');

    // 7. Verify Sanitization Security Check
    console.log('\n[7/7] Verifying Sensitive Data Sanitization Integrity...');
    const allRecentLogs = [logoutLog, resetReqLog, resetSuccessLog, verifyLog, reviewLog].filter(Boolean);
    let breachDetected = false;
    for (const log of allRecentLogs) {
      const str = JSON.stringify(log);
      if (str.includes('newPassword123') || str.includes('safe_test_token') || str.includes('safe_verify_token')) {
        breachDetected = true;
        console.error(`❌ Sensitive value leaked in log ID ${log.id}`);
      }
    }
    assert(!breachDetected, 'Zero sensitive passwords/tokens leaked in audit logs');

    console.log(`\n==================================================`);
    console.log(`🎉 TASK 2B VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

  } catch (err) {
    console.error('\n❌ VERIFICATION ERROR:', err);
    failed++;
  } finally {
    // Explicit Cleanup: Delete all temporary test entities and their audit records
    if (tempAppt) {
      await Review.destroy({ where: { appointment_id: tempAppt.id } });
      await Appointment.destroy({ where: { id: tempAppt.id } });
    }
    if (tempUser) {
      await AuditLog.destroy({ where: { entity_id: String(tempUser.id) } });
      await AuditLog.destroy({ where: { actor_user_id: tempUser.id } });
      await User.destroy({ where: { id: tempUser.id } });
    }
    console.log('✓ Temporary test records cleaned up. DB left in 100% clean state.\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTask2BSafeVerification();
