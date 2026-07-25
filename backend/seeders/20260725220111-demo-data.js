'use strict';

const factories = require('../factories');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Users
    const clientsData = Array.from({ length: 5 }).map(() => factories.createFakeUser('client'));
    const mechanicsData = Array.from({ length: 2 }).map(() => factories.createFakeUser('mechanic'));
    const adminData = [factories.createFakeUser('admin')];
    
    await queryInterface.bulkInsert('users', [...clientsData, ...mechanicsData, ...adminData], {});
    const [users] = await queryInterface.sequelize.query(`SELECT id, role FROM users;`);
    
    const clients = users.filter(u => u.role === 'client');
    const mechanics = users.filter(u => u.role === 'mechanic');

    if (clients.length === 0 || mechanics.length === 0) return; // safety check

    // 2. Vehicles
    const vehiclesData = clients.map(client => factories.createFakeVehicle(client.id));
    await queryInterface.bulkInsert('vehicles', vehiclesData, {});
    const [vehicles] = await queryInterface.sequelize.query(`SELECT id FROM vehicles;`);

    // 3. Spare Parts
    const sparePartsData = Array.from({ length: 10 }).map(() => factories.createFakeSparePart());
    await queryInterface.bulkInsert('spare_parts', sparePartsData, {});
    const [parts] = await queryInterface.sequelize.query(`SELECT id FROM spare_parts;`);

    // 4. Appointments
    const appointmentsData = vehicles.map((vehicle, index) => {
      const client = clients[index % clients.length];
      const mechanic = mechanics[index % mechanics.length];
      return factories.createFakeAppointment(client.id, vehicle.id, mechanic.id);
    });
    await queryInterface.bulkInsert('appointments', appointmentsData, {});
    const [appointments] = await queryInterface.sequelize.query(`SELECT id, mechanic_id, client_id FROM appointments;`);

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
    const [invoices] = await queryInterface.sequelize.query(`SELECT id FROM invoices;`);

    // 8. Invoice Items
    const invoiceItemsData = invoices.flatMap(invoice => {
      return [
        factories.createFakeInvoiceItem(invoice.id, parts[0].id),
        factories.createFakeInvoiceItem(invoice.id, parts[1].id)
      ];
    });
    await queryInterface.bulkInsert('invoice_items', invoiceItemsData, {});

    // 9. Payments
    const paymentsData = invoices.map(invoice => factories.createFakePayment(invoice.id));
    await queryInterface.bulkInsert('payments', paymentsData, {});

    // 10. Reviews
    const reviewsData = appointments.map(app => factories.createFakeReview(app.id, app.client_id));
    await queryInterface.bulkInsert('reviews', reviewsData, {});
  },

  async down (queryInterface, Sequelize) {
    // Delete in reverse order of dependencies
    await queryInterface.bulkDelete('reviews', null, {});
    await queryInterface.bulkDelete('payments', null, {});
    await queryInterface.bulkDelete('invoice_items', null, {});
    await queryInterface.bulkDelete('invoices', null, {});
    await queryInterface.bulkDelete('required_parts', null, {});
    await queryInterface.bulkDelete('technical_reports', null, {});
    await queryInterface.bulkDelete('appointments', null, {});
    await queryInterface.bulkDelete('spare_parts', null, {});
    await queryInterface.bulkDelete('vehicles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
