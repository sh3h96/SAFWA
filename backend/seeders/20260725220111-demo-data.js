'use strict';

const factories = require('../factories');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // We will generate:
    // 5 clients (users with role=client)
    // 2 mechanics (users with role=mechanic)
    // 1 admin (user with role=admin)
    // 5 vehicles (one per client)
    // 10 spare parts
    // 5 appointments
    // 5 technical reports
    // 10 required parts
    // 5 invoices
    // 10 invoice items
    // 5 payments
    // 5 reviews

    // 1. Users
    const clientsData = Array.from({ length: 5 }).map(() => factories.createFakeUser('client'));
    const mechanicsData = Array.from({ length: 2 }).map(() => factories.createFakeUser('mechanic'));
    const adminData = [factories.createFakeUser('admin')];
    
    // We must insert and get back IDs. Since bulkInsert doesn't always return all inserted IDs in all dialects seamlessly without specifying returning:true,
    // wait, in MySQL bulkInsert doesn't return IDs reliably. So we will just query them after insertion by email, or since we know there are no users, we can just fetch all users.
    await queryInterface.bulkInsert('Users', [...clientsData, ...mechanicsData, ...adminData], {});
    const [users] = await queryInterface.sequelize.query(`SELECT id, role FROM Users;`);
    
    const clients = users.filter(u => u.role === 'client');
    const mechanics = users.filter(u => u.role === 'mechanic');

    if (clients.length === 0 || mechanics.length === 0) return; // safety check

    // 2. Vehicles
    const vehiclesData = clients.map(client => factories.createFakeVehicle(client.id));
    await queryInterface.bulkInsert('Vehicles', vehiclesData, {});
    const [vehicles] = await queryInterface.sequelize.query(`SELECT id FROM Vehicles;`);

    // 3. Spare Parts
    const sparePartsData = Array.from({ length: 10 }).map(() => factories.createFakeSparePart());
    await queryInterface.bulkInsert('SpareParts', sparePartsData, {});
    const [parts] = await queryInterface.sequelize.query(`SELECT id FROM SpareParts;`);

    // 4. Appointments
    const appointmentsData = vehicles.map((vehicle, index) => {
      const client = clients[index % clients.length];
      const mechanic = mechanics[index % mechanics.length];
      return factories.createFakeAppointment(client.id, vehicle.id, mechanic.id);
    });
    await queryInterface.bulkInsert('Appointments', appointmentsData, {});
    const [appointments] = await queryInterface.sequelize.query(`SELECT id, mechanic_id, client_id FROM Appointments;`);

    // 5. Technical Reports
    const reportsData = appointments.map(app => factories.createFakeTechnicalReport(app.id, app.mechanic_id));
    await queryInterface.bulkInsert('TechnicalReports', reportsData, {});
    const [reports] = await queryInterface.sequelize.query(`SELECT id FROM TechnicalReports;`);

    // 6. Required Parts
    const requiredPartsData = reports.flatMap(report => {
      return [
        factories.createFakeRequiredPart(report.id, parts[0].id),
        factories.createFakeRequiredPart(report.id, parts[1].id)
      ];
    });
    await queryInterface.bulkInsert('RequiredParts', requiredPartsData, {});

    // 7. Invoices
    const invoicesData = appointments.map(app => factories.createFakeInvoice(app.id));
    await queryInterface.bulkInsert('Invoices', invoicesData, {});
    const [invoices] = await queryInterface.sequelize.query(`SELECT id FROM Invoices;`);

    // 8. Invoice Items
    const invoiceItemsData = invoices.flatMap(invoice => {
      return [
        factories.createFakeInvoiceItem(invoice.id, parts[0].id),
        factories.createFakeInvoiceItem(invoice.id, parts[1].id)
      ];
    });
    await queryInterface.bulkInsert('InvoiceItems', invoiceItemsData, {});

    // 9. Payments
    const paymentsData = invoices.map(invoice => factories.createFakePayment(invoice.id));
    await queryInterface.bulkInsert('Payments', paymentsData, {});

    // 10. Reviews
    const reviewsData = appointments.map(app => factories.createFakeReview(app.id, app.client_id));
    await queryInterface.bulkInsert('Reviews', reviewsData, {});
  },

  async down (queryInterface, Sequelize) {
    // Delete in reverse order of dependencies
    await queryInterface.bulkDelete('Reviews', null, {});
    await queryInterface.bulkDelete('Payments', null, {});
    await queryInterface.bulkDelete('InvoiceItems', null, {});
    await queryInterface.bulkDelete('Invoices', null, {});
    await queryInterface.bulkDelete('RequiredParts', null, {});
    await queryInterface.bulkDelete('TechnicalReports', null, {});
    await queryInterface.bulkDelete('Appointments', null, {});
    await queryInterface.bulkDelete('SpareParts', null, {});
    await queryInterface.bulkDelete('Vehicles', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
