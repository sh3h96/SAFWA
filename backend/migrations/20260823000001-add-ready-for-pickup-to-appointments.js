'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('appointments', 'status', {
      type: Sequelize.ENUM(
        'pending',
        'awaiting_assignment',
        'under_inspection',
        'in_progress',
        'waiting_parts',
        'ready_for_pickup',
        'completed',
        'cancelled'
      ),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('appointments', 'status', {
      type: Sequelize.ENUM(
        'pending',
        'awaiting_assignment',
        'under_inspection',
        'in_progress',
        'waiting_parts',
        'completed',
        'cancelled'
      ),
      allowNull: true,
    });
  }
};
