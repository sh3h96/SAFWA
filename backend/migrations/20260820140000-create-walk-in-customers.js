'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('walk_in_customers', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('walk_in_customers', ['phone'], {
      name: 'idx_walk_in_customers_phone'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('walk_in_customers');
  }
};
