'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('technical_reports', 'rework_history', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('technical_reports', 'rework_history');
  }
};
