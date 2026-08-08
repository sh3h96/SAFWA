'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('spare_parts', 'min_stock_level', {
        type: Sequelize.INTEGER,
        defaultValue: 5
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('spare_parts', 'brand', {
        type: Sequelize.STRING,
        allowNull: true
      });
    } catch (e) {}
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('spare_parts', 'min_stock_level');
    await queryInterface.removeColumn('spare_parts', 'brand');
  }
};
