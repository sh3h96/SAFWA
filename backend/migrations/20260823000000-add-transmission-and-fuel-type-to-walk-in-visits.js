'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('walk_in_visits');
    if (!tableInfo.vehicle_transmission) {
      await queryInterface.addColumn('walk_in_visits', 'vehicle_transmission', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    if (!tableInfo.vehicle_fuel_type) {
      await queryInterface.addColumn('walk_in_visits', 'vehicle_fuel_type', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('walk_in_visits');
    if (tableInfo.vehicle_transmission) {
      await queryInterface.removeColumn('walk_in_visits', 'vehicle_transmission');
    }
    if (tableInfo.vehicle_fuel_type) {
      await queryInterface.removeColumn('walk_in_visits', 'vehicle_fuel_type');
    }
  }
};
