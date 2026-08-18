const { User, Vehicle, Appointment, AppointmentMechanic, TechnicalReport, RequiredPart, SparePart, Invoice, InvoiceItem, Payment, Review, sequelize } = require('./models');
const bcrypt = require('bcrypt');

async function runTask22Verification() {
  console.log('==================================================');
  console.log('STARTING TASK 22 VERIFICATION SUITE');
  console.log('==================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  try {
    // 1. CANONICAL SUPER ADMIN AUDIT
    const superAdmin = await User.findOne({ where: { email: 'super_admin@safwa.sa' } });
    assert(!!superAdmin, 'Test 1: Canonical Super Admin account (super_admin@safwa.sa) exists');

    if (superAdmin) {
      assert(superAdmin.phone === '777123456', 'Test 2: Super Admin phone is canonical 777123456');
      assert(superAdmin.role === 'super_admin', 'Test 3: Super Admin role is super_admin');
      assert(superAdmin.is_email_verified === true, 'Test 4: Super Admin is_email_verified is true');

      const isPassValid = await bcrypt.compare('password1234', superAdmin.password);
      assert(isPassValid, 'Test 5: Super Admin password matches password1234');
    }

    // 2. PHONE VALIDITY AUDIT FOR ALL USERS
    const allUsers = await User.findAll();
    assert(allUsers.length > 0, `Test 6: Database contains active user records (${allUsers.length} total)`);

    const YEMENI_PHONE_REGEX = /^7\d{8}$/;
    let allPhonesValid = true;
    let invalidPhoneList = [];

    allUsers.forEach(u => {
      if (!YEMENI_PHONE_REGEX.test(u.phone)) {
        allPhonesValid = false;
        invalidPhoneList.push(`${u.email}: ${u.phone}`);
      }
    });

    assert(allPhonesValid, `Test 7: All user phone numbers strictly conform to Yemeni 9-digit rule /^7\\d{8}$/${invalidPhoneList.length > 0 ? ` (Invalid: ${invalidPhoneList.join(', ')})` : ''}`);

    // 3. EMAIL SYNTAX & UNIQUENESS AUDIT
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let allEmailsValid = true;
    const emailSet = new Set();
    let duplicateEmailFound = false;

    allUsers.forEach(u => {
      if (!EMAIL_REGEX.test(u.email)) {
        allEmailsValid = false;
      }
      if (emailSet.has(u.email.toLowerCase())) {
        duplicateEmailFound = true;
      }
      emailSet.add(u.email.toLowerCase());
    });

    assert(allEmailsValid, 'Test 8: Every user email is syntactically valid');
    assert(!duplicateEmailFound, 'Test 9: Every user email is unique across the database');

    // 4. PHONE UNIQUENESS AUDIT
    const phoneSet = new Set();
    let duplicatePhoneFound = false;

    allUsers.forEach(u => {
      if (phoneSet.has(u.phone)) {
        duplicatePhoneFound = true;
      }
      phoneSet.add(u.phone);
    });

    assert(!duplicatePhoneFound, 'Test 10: Every user phone number is unique across the database');

    // 5. ROLE HIERARCHY VALIDITY AUDIT
    const VALID_ROLES = ['super_admin', 'admin', 'mechanic', 'client'];
    let allRolesValid = true;

    allUsers.forEach(u => {
      if (!VALID_ROLES.includes(u.role)) {
        allRolesValid = false;
      }
    });

    assert(allRolesValid, 'Test 11: All user roles strictly belong to [super_admin, admin, mechanic, client]');

    // 6. PERSONAL DEVELOPER DATA AUDIT
    const personalEmails = ['shehabshawgi@gmail.com', 'shehab@gmail.com'];
    const personalPhones = ['777537842'];

    let personalDataFound = false;
    allUsers.forEach(u => {
      if (personalEmails.includes(u.email.toLowerCase()) || personalPhones.includes(u.phone)) {
        personalDataFound = true;
      }
    });

    assert(!personalDataFound, 'Test 12: Zero personal developer email/phone records remain in canonical user dataset');

    // 7. REFERENTIAL INTEGRITY AUDIT
    const userIds = new Set(allUsers.map(u => u.id));

    // Vehicles -> Client User
    const vehicles = await Vehicle.findAll();
    let brokenVehicleFK = false;
    vehicles.forEach(v => {
      if (!userIds.has(v.client_id)) brokenVehicleFK = true;
    });
    assert(!brokenVehicleFK, 'Test 13: Referential integrity: All vehicles reference valid client IDs');

    // Appointments -> Client & Mechanic
    const appointments = await Appointment.findAll();
    let brokenAppointmentFK = false;
    appointments.forEach(a => {
      if (!userIds.has(a.client_id)) brokenAppointmentFK = true;
      if (a.mechanic_id && !userIds.has(a.mechanic_id)) brokenAppointmentFK = true;
    });
    assert(!brokenAppointmentFK, 'Test 14: Referential integrity: All appointments reference valid client & mechanic IDs');

    // Technical Reports -> Appointment & Mechanic
    const reports = await TechnicalReport.findAll();
    const appointmentIds = new Set(appointments.map(a => a.id));
    let brokenReportFK = false;
    reports.forEach(r => {
      if (!appointmentIds.has(r.appointment_id)) brokenReportFK = true;
      if (r.mechanic_id && !userIds.has(r.mechanic_id)) brokenReportFK = true;
    });
    assert(!brokenReportFK, 'Test 15: Referential integrity: All technical reports reference valid appointment & mechanic IDs');

    // Invoices -> Appointment
    const invoices = await Invoice.findAll();
    let brokenInvoiceFK = false;
    invoices.forEach(inv => {
      if (!appointmentIds.has(inv.appointment_id)) brokenInvoiceFK = true;
    });
    assert(!brokenInvoiceFK, 'Test 16: Referential integrity: All invoices reference valid appointment IDs');

    // Reviews -> Client & Appointment
    const reviews = await Review.findAll();
    let brokenReviewFK = false;
    reviews.forEach(rev => {
      if (!userIds.has(rev.client_id)) brokenReviewFK = true;
      if (!appointmentIds.has(rev.appointment_id)) brokenReviewFK = true;
    });
    assert(!brokenReviewFK, 'Test 17: Referential integrity: All reviews reference valid client & appointment IDs');

  } catch (err) {
    console.error('\n❌ UNEXPECTED ERROR IN TASK 22 VERIFICATION:', err);
    failedCount++;
  }

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passedCount}/${passedCount + failedCount} TESTS PASSED`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTask22Verification();
