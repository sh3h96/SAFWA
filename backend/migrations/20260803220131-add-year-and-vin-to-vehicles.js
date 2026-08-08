'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('vehicles', 'year', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('vehicles', 'vin', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('vehicles', 'year');
    await queryInterface.removeColumn('vehicles', 'vin');
  }
};
