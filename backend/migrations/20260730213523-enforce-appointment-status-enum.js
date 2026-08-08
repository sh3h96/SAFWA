'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('appointments', 'status', {
      type: Sequelize.ENUM('pending', 'under_inspection', 'in_progress', 'waiting_parts', 'completed', 'cancelled'),
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('appointments', 'status', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};
