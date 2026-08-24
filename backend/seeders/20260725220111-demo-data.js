'use strict';

const factories = require('../factories');
const superAdminPasswordHash = '$2b$10$TgZ2fKyCjDx9jnfQd081H.WfjgPUrScJZjGMQwaN5ec.XQspEiDBC'; // password1234

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Canonical Users List
    const canonicalUsers = [
      factories.createFakeUser('super_admin', {
        name: 'Super Admin',
        email: 'super_admin@safwa.sa',
        phone: '777123456',
        password: superAdminPasswordHash,
        is_email_verified: true,
        status: 'active',
        isCanonicalSuperAdmin: true
      }),
      factories.createFakeUser('admin', {
        name: 'مدير النظام',
        email: 'admin@safwa.sa',
        phone: '777123457',
        is_email_verified: true,
        status: 'active'
      }),
      factories.createFakeUser('mechanic', {
        name: 'مهندس الصيانة',
        email: 'mechanic@safwa.sa',
        phone: '777123458',
        is_email_verified: true,
        status: 'active'
      }),
      factories.createFakeUser('mechanic', {
        name: 'فني السيارات',
        email: 'mechanic2@safwa.sa',
        phone: '777123459',
        is_email_verified: true,
        status: 'active'
      }),
      factories.createFakeUser('client', {
        name: 'عميل صفوة',
        email: 'client@safwa.sa',
        phone: '777123460',
        is_email_verified: true,
        status: 'active'
      }),
      factories.createFakeUser('client', {
        name: 'علي أحمد',
        email: 'client2@safwa.sa',
        phone: '777123461',
        is_email_verified: true,
        status: 'active'
      }),
      factories.createFakeUser('client', {
        name: 'محمد صالح',
        email: 'client3@safwa.sa',
        phone: '777123462',
        is_email_verified: true,
        status: 'active'
      }),
      factories.createFakeUser('client', {
        name: 'سارَة خالد',
        email: 'client4@safwa.sa',
        phone: '777123463',
        is_email_verified: true,
        status: 'active'
      }),
      factories.createFakeUser('client', {
        name: 'عمر حسن',
        email: 'client5@safwa.sa',
        phone: '777123464',
        is_email_verified: true,
        status: 'active'
      }),
    ];

    // Clean up demo data safely in reverse dependency order
    await queryInterface.bulkDelete('reviews', null, {});
    await queryInterface.bulkDelete('payments', null, {});
    await queryInterface.bulkDelete('invoice_items', null, {});
    await queryInterface.bulkDelete('invoices', null, {});
    await queryInterface.bulkDelete('new_part_requests', null, {});
    await queryInterface.bulkDelete('required_parts', null, {});
    await queryInterface.bulkDelete('technical_reports', null, {});
    await queryInterface.bulkDelete('appointment_mechanics', null, {});
    await queryInterface.bulkDelete('walk_in_visits', null, {});
    await queryInterface.bulkDelete('walk_in_customers', null, {});
    await queryInterface.bulkDelete('appointments', null, {});
    await queryInterface.bulkDelete('spare_parts', null, {});
    await queryInterface.bulkDelete('vehicles', null, {});
    await queryInterface.bulkDelete('users', null, {});

    // 1. Insert Canonical Users
    await queryInterface.bulkInsert('users', canonicalUsers, {});
    const [users] = await queryInterface.sequelize.query(`SELECT id, role FROM users;`);

    const clients = users.filter(u => u.role === 'client');
    const mechanics = users.filter(u => u.role === 'mechanic');

    if (clients.length === 0 || mechanics.length === 0) return;

    // 2. Insert Vehicles
    const vehiclesData = clients.map(client => factories.createFakeVehicle(client.id));
    await queryInterface.bulkInsert('vehicles', vehiclesData, {});
    const [vehicles] = await queryInterface.sequelize.query(`SELECT id, client_id FROM vehicles;`);

    // 3. Insert Spare Parts
    const sparePartsData = [
      factories.createFakeSparePart({ name: 'زيت محرك 5W-30', part_number: 'OIL-5W30', price: 12000, stock_quantity: 40 }),
      factories.createFakeSparePart({ name: 'فلتر زيت تويوتا', part_number: 'FLT-TOY-01', price: 3500, stock_quantity: 25 }),
      factories.createFakeSparePart({ name: 'أقمشة فرامل أمامية', part_number: 'BRK-PAD-F', price: 28000, stock_quantity: 15 }),
      factories.createFakeSparePart({ name: 'بواجي هيونداي (طقم)', part_number: 'SPK-HYU-04', price: 18000, stock_quantity: 20 }),
      factories.createFakeSparePart({ name: 'بطارية 60 أمبير', part_number: 'BAT-60AH', price: 45000, stock_quantity: 10 }),
    ];
    await queryInterface.bulkInsert('spare_parts', sparePartsData, {});
    const [parts] = await queryInterface.sequelize.query(`SELECT id, price FROM spare_parts;`);

    // 4. Create Workflow-Consistent Appointments
    // We will generate distinct appointments following strict status prerequisites
    const appointmentsData = [
      factories.createPendingAppointment(clients[0].id, vehicles[0].id),
      factories.createUnderInspectionAppointment(clients[1].id, vehicles[1].id, mechanics[0].id),
      factories.createInProgressAppointment(clients[2].id, vehicles[2].id, mechanics[1].id),
      factories.createReadyForPickupAppointment(clients[3].id, vehicles[3].id, mechanics[0].id),
      factories.createCompletedAppointment(clients[4].id, vehicles[4].id, mechanics[1].id),
      factories.createCancelledAppointment(clients[0].id, vehicles[0].id, 'إلغاء بناء على طلب العميل'),
    ];

    await queryInterface.bulkInsert('appointments', appointmentsData, {});
    const [appointments] = await queryInterface.sequelize.query(`SELECT id, status, client_id, mechanic_id FROM appointments ORDER BY id ASC;`);

    // 4b. Multi-Mechanic Junction Sync
    const appointmentMechanicsData = [];
    appointments.forEach(app => {
      if (app.mechanic_id) {
        appointmentMechanicsData.push({
          appointment_id: app.id,
          mechanic_id: app.mechanic_id,
          assigned_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    });
    if (appointmentMechanicsData.length > 0) {
      await queryInterface.bulkInsert('appointment_mechanics', appointmentMechanicsData, {});
    }

    // 5. Technical Reports (Required for under_inspection, in_progress, ready_for_pickup, completed)
    const activeWithReports = appointments.filter(a => ['under_inspection', 'in_progress', 'ready_for_pickup', 'completed'].includes(a.status));
    const reportsData = activeWithReports.map(app => factories.createFakeTechnicalReport(app.id, app.mechanic_id));
    await queryInterface.bulkInsert('technical_reports', reportsData, {});
    const [reports] = await queryInterface.sequelize.query(`SELECT id, appointment_id FROM technical_reports;`);

    const reportMap = new Map();
    reports.forEach(r => reportMap.set(r.appointment_id, r.id));

    // 6. Required Parts (Linked to valid TechnicalReport)
    const requiredPartsData = [];
    // under_inspection -> pending part
    const appUnderInsp = appointments.find(a => a.status === 'under_inspection');
    if (appUnderInsp && reportMap.has(appUnderInsp.id)) {
      requiredPartsData.push(factories.createFakeRequiredPart(reportMap.get(appUnderInsp.id), parts[0].id, { status: 'pending', quantity: 1 }));
    }
    // in_progress -> approved part
    const appInProgress = appointments.find(a => a.status === 'in_progress');
    if (appInProgress && reportMap.has(appInProgress.id)) {
      requiredPartsData.push(factories.createFakeRequiredPart(reportMap.get(appInProgress.id), parts[1].id, { status: 'approved', quantity: 1 }));
    }
    // ready_for_pickup -> installed part
    const appReady = appointments.find(a => a.status === 'ready_for_pickup');
    if (appReady && reportMap.has(appReady.id)) {
      requiredPartsData.push(factories.createFakeRequiredPart(reportMap.get(appReady.id), parts[2].id, { status: 'installed', quantity: 1 }));
    }
    // completed -> installed part
    const appCompleted = appointments.find(a => a.status === 'completed');
    if (appCompleted && reportMap.has(appCompleted.id)) {
      requiredPartsData.push(factories.createFakeRequiredPart(reportMap.get(appCompleted.id), parts[3].id, { status: 'installed', quantity: 1 }));
    }

    if (requiredPartsData.length > 0) {
      await queryInterface.bulkInsert('required_parts', requiredPartsData, {});
    }

    // 7. Invoices (Created for in_progress, ready_for_pickup, completed)
    const invoiceTargetApps = appointments.filter(a => ['in_progress', 'ready_for_pickup', 'completed'].includes(a.status));
    const invoicesData = invoiceTargetApps.map(app => {
      let invStatus = 'unpaid';
      let totalAmount = 25000.0;
      if (app.status === 'ready_for_pickup') {
        invStatus = 'partially_paid';
        totalAmount = 30000.0;
      } else if (app.status === 'completed') {
        invStatus = 'paid';
        totalAmount = 40000.0;
      }
      return factories.createFakeInvoice(app.id, { status: invStatus, total_amount: totalAmount });
    });

    await queryInterface.bulkInsert('invoices', invoicesData, {});
    const [invoices] = await queryInterface.sequelize.query(`SELECT id, appointment_id, total_amount, status FROM invoices;`);

    // 8. Invoice Items (Snapshot pricing)
    const invoiceItemsData = invoices.flatMap(inv => [
      factories.createFakeInvoiceItem(inv.id, parts[0].id, { description: 'أجور اليد والخدمة', quantity: 1, unit_price: 10000.0 }),
      factories.createFakeInvoiceItem(inv.id, parts[1].id, { description: 'قطع غيار مستخدمة', quantity: 1, unit_price: parseFloat(inv.total_amount) - 10000.0 })
    ]);
    await queryInterface.bulkInsert('invoice_items', invoiceItemsData, {});

    // 9. Payments (Payments match invoice status: paid = 100%, partially_paid = 50%)
    const paymentsData = [];
    invoices.forEach(inv => {
      const total = parseFloat(inv.total_amount);
      if (inv.status === 'paid') {
        paymentsData.push(factories.createFakePayment(inv, total));
      } else if (inv.status === 'partially_paid') {
        paymentsData.push(factories.createFakePayment(inv, total * 0.5));
      }
    });

    if (paymentsData.length > 0) {
      await queryInterface.bulkInsert('payments', paymentsData, {});
    }

    // 10. Walk-in Customer & Walk-in Visit (Without User account)
    await queryInterface.bulkInsert('walk_in_customers', [{
      name: 'عميل حضوري تجريبي',
      phone: '778999111',
      notes: 'عميل حضوري بدون حساب مستخدم',
      created_at: new Date(),
      updated_at: new Date()
    }], {});

    const [walkIns] = await queryInterface.sequelize.query(`SELECT id FROM walk_in_customers;`);
    if (walkIns.length > 0) {
      await queryInterface.bulkInsert('walk_in_visits', [{
        walk_in_customer_id: walkIns[0].id,
        vehicle_make: 'Nissan',
        vehicle_model: 'Patrol',
        vehicle_year: 2021,
        vehicle_license_plate: '1234-YEM',
        problem_description: 'فحص دوري واستبدال زيت',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }], {});
    }

    // 11. Reviews (Only for completed appointment)
    if (appCompleted) {
      await queryInterface.bulkInsert('reviews', [
        factories.createFakeReview(appCompleted.id, appCompleted.client_id, { rating: 5, comment: 'خدمة ممتازة وسريعة' })
      ], {});
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('reviews', null, {});
    await queryInterface.bulkDelete('payments', null, {});
    await queryInterface.bulkDelete('invoice_items', null, {});
    await queryInterface.bulkDelete('invoices', null, {});
    await queryInterface.bulkDelete('new_part_requests', null, {});
    await queryInterface.bulkDelete('required_parts', null, {});
    await queryInterface.bulkDelete('technical_reports', null, {});
    await queryInterface.bulkDelete('appointment_mechanics', null, {});
    await queryInterface.bulkDelete('walk_in_visits', null, {});
    await queryInterface.bulkDelete('walk_in_customers', null, {});
    await queryInterface.bulkDelete('appointments', null, {});
    await queryInterface.bulkDelete('spare_parts', null, {});
    await queryInterface.bulkDelete('vehicles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
