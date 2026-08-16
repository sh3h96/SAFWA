'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Safely migrate any existing receptionist users to admin role
    await queryInterface.sequelize.query(
      `UPDATE users SET role = 'admin' WHERE role = 'receptionist';`
    );
  },

  async down (queryInterface, Sequelize) {
    // No-op: Receptionist role is permanently consolidated into admin
  }
};
