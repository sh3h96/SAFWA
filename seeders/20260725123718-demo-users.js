'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Users', [
      {
        name: 'مدير الورشة',
        email: 'admin@safwa.com',
        phone: '0501234567',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'محمد أحمد',
        email: 'customer@safwa.com',
        phone: '0507654321',
        role: 'customer',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Users', null, {});
  }
};