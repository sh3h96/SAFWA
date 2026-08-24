'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('technical_reports', 'odometer', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('technical_reports', 'obd2_codes', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('technical_reports', 'visual_notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('technical_reports', 'repair_plan', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('technical_reports', 'urgency_level', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('technical_reports', 'odometer');
    await queryInterface.removeColumn('technical_reports', 'obd2_codes');
    await queryInterface.removeColumn('technical_reports', 'visual_notes');
    await queryInterface.removeColumn('technical_reports', 'repair_plan');
    await queryInterface.removeColumn('technical_reports', 'urgency_level');
  }
};
