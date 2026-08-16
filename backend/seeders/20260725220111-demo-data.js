'use strict';

const factories = require('../factories');
const superAdminPasswordHash = '$2b$10$TgZ2fKyCjDx9jnfQd081H.WfjgPUrScJZjGMQwaN5ec.XQspEiDBC'; // password1234

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Users
    const clientsData = Array.from({ length: 5 }).map(() => factories.createFakeUser('client'));
    clientsData[0].email = 'client@safwa.sa';

    const mechanicsData = Array.from({ length: 2 }).map(() => factories.createFakeUser('mechanic'));
    mechanicsData[0].email = 'mechanic@safwa.sa';

    const adminData = [factories.createFakeUser('admin', { email: 'admin@safwa.sa' })];
    
    // Primary Super Admin (Shehab) - Idempotent Handling
    const [existingSuperAdmin] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'shehabshawgi@gmail.com' LIMIT 1;`
    );

    if (existingSuperAdmin.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE users SET name = 'Shehab', phone = '777537842', role = 'super_admin', status = 'active', is_email_verified = true, password = '${superAdminPasswordHash}', updated_at = NOW() WHERE email = 'shehabshawgi@gmail.com';`
      );
      await queryInterface.bulkInsert('users', [...clientsData, ...mechanicsData, ...adminData], {});
    } else {
      const superAdminData = [
        factories.createFakeUser('super_admin', {
          name: 'Shehab',
          email: 'shehabshawgi@gmail.com',
          phone: '777537842',
          password: superAdminPasswordHash,
          is_email_verified: true,
          status: 'active'
        })
      ];
      await queryInterface.bulkInsert('users', [...clientsData, ...mechanicsData, ...adminData, ...superAdminData], {});
    }

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
      // Primary mechanic assignment
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

      // Additional mechanic for multi-mechanic seed demonstration
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

    // 9. Payments (Financial Business Logic Consistency)
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
