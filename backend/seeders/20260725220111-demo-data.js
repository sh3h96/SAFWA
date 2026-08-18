'use strict';

const factories = require('../factories');
const superAdminPasswordHash = '$2b$10$TgZ2fKyCjDx9jnfQd081H.WfjgPUrScJZjGMQwaN5ec.XQspEiDBC'; // password1234

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Canonical Users List conforming strictly to Yemeni phone rule (/^7\d{8}$/) and removing personal developer data
    const canonicalUsers = [
      factories.createFakeUser('super_admin', {
        name: 'Super Admin',
        email: 'super_admin@safwa.sa',
        phone: '777123456',
        password: superAdminPasswordHash,
        is_email_verified: true,
        status: 'active'
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

    // Clean up old/invalid demo data if present to ensure referential integrity
    await queryInterface.bulkDelete('reviews', null, {});
    await queryInterface.bulkDelete('payments', null, {});
    await queryInterface.bulkDelete('invoice_items', null, {});
    await queryInterface.bulkDelete('invoices', null, {});
    await queryInterface.bulkDelete('required_parts', null, {});
    await queryInterface.bulkDelete('technical_reports', null, {});
    await queryInterface.bulkDelete('appointment_mechanics', null, {});
    await queryInterface.bulkDelete('appointments', null, {});
    await queryInterface.bulkDelete('spare_parts', null, {});
    await queryInterface.bulkDelete('vehicles', null, {});
    await queryInterface.bulkDelete('users', null, {});

    // Insert Canonical Users
    await queryInterface.bulkInsert('users', canonicalUsers, {});

    const [users] = await queryInterface.sequelize.query(`SELECT id, role FROM users;`);

    const clients = users.filter(u => u.role === 'client');
    const mechanics = users.filter(u => u.role === 'mechanic');

    if (clients.length === 0 || mechanics.length === 0) return;

    // 2. Vehicles
    const vehiclesData = clients.map(client => factories.createFakeVehicle(client.id));
    await queryInterface.bulkInsert('vehicles', vehiclesData, {});
    const [vehicles] = await queryInterface.sequelize.query(`SELECT id, client_id FROM vehicles;`);

    // 3. Spare Parts
    const sparePartsData = Array.from({ length: 10 }).map(() => factories.createFakeSparePart());
    await queryInterface.bulkInsert('spare_parts', sparePartsData, {});
    const [parts] = await queryInterface.sequelize.query(`SELECT id FROM spare_parts;`);

    // 4. Appointments
    const appointmentsData = vehicles.map((vehicle, index) => {
      const mechanic = mechanics[index % mechanics.length];
      return factories.createFakeAppointment(vehicle.client_id, vehicle.id, mechanic.id);
    });
    await queryInterface.bulkInsert('appointments', appointmentsData, {});
    const [appointments] = await queryInterface.sequelize.query(`SELECT id, mechanic_id, client_id FROM appointments;`);

    // 4b. Multi-Mechanic Sync (appointment_mechanics)
    const appointmentMechanicsData = [];
    const createdPairs = new Set();

    appointments.forEach((app, idx) => {
      if (app.mechanic_id) {
        const pairKey = `${app.id}_${app.mechanic_id}`;
        if (!createdPairs.has(pairKey)) {
          createdPairs.add(pairKey);
          appointmentMechanicsData.push({
            appointment_id: app.id,
            mechanic_id: app.mechanic_id,
            assigned_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      if (idx === 0 && mechanics.length > 1) {
        const secondMech = mechanics.find(m => m.id !== app.mechanic_id);
        if (secondMech) {
          const pairKey2 = `${app.id}_${secondMech.id}`;
          if (!createdPairs.has(pairKey2)) {
            createdPairs.add(pairKey2);
            appointmentMechanicsData.push({
              appointment_id: app.id,
              mechanic_id: secondMech.id,
              assigned_at: new Date(),
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }
      }
    });

    if (appointmentMechanicsData.length > 0) {
      await queryInterface.bulkInsert('appointment_mechanics', appointmentMechanicsData, {});
    }

    // 5. Technical Reports
    const reportsData = appointments.map(app => factories.createFakeTechnicalReport(app.id, app.mechanic_id));
    await queryInterface.bulkInsert('technical_reports', reportsData, {});
    const [reports] = await queryInterface.sequelize.query(`SELECT id FROM technical_reports;`);

    // 6. Required Parts
    const requiredPartsData = reports.flatMap(report => {
      return [
        factories.createFakeRequiredPart(report.id, parts[0].id),
        factories.createFakeRequiredPart(report.id, parts[1].id)
      ];
    });
    await queryInterface.bulkInsert('required_parts', requiredPartsData, {});

    // 7. Invoices
    const invoicesData = appointments.map(app => factories.createFakeInvoice(app.id));
    await queryInterface.bulkInsert('invoices', invoicesData, {});
    const [invoices] = await queryInterface.sequelize.query(`SELECT id, total_amount, status FROM invoices;`);

    // 8. Invoice Items
    const invoiceItemsData = invoices.flatMap(invoice => {
      return [
        factories.createFakeInvoiceItem(invoice.id, parts[0].id),
        factories.createFakeInvoiceItem(invoice.id, parts[1].id)
      ];
    });
    await queryInterface.bulkInsert('invoice_items', invoiceItemsData, {});

    // 9. Payments
    const paymentsData = [];
    invoices.forEach(invoice => {
      const total = parseFloat(invoice.total_amount);
      if (invoice.status === 'paid') {
        paymentsData.push(factories.createFakePayment(invoice, total));
      } else if (invoice.status === 'partially_paid') {
        const partial = Math.round((total * 0.5) * 100) / 100;
        paymentsData.push(factories.createFakePayment(invoice, partial));
      }
    });
    if (paymentsData.length > 0) {
      await queryInterface.bulkInsert('payments', paymentsData, {});
    }

    // 10. Reviews
    const reviewsData = appointments.map(app => factories.createFakeReview(app.id, app.client_id));
    await queryInterface.bulkInsert('reviews', reviewsData, {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('reviews', null, {});
    await queryInterface.bulkDelete('payments', null, {});
    await queryInterface.bulkDelete('invoice_items', null, {});
    await queryInterface.bulkDelete('invoices', null, {});
    await queryInterface.bulkDelete('required_parts', null, {});
    await queryInterface.bulkDelete('technical_reports', null, {});
    await queryInterface.bulkDelete('appointment_mechanics', null, {});
    await queryInterface.bulkDelete('appointments', null, {});
    await queryInterface.bulkDelete('spare_parts', null, {});
    await queryInterface.bulkDelete('vehicles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
