'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoices', {
            id: {
                "type": Sequelize.BIGINT,
                "primaryKey": true,
                "autoIncrement": true
            },
            appointment_id: {
                "type": Sequelize.BIGINT,
                "references": {
                    "model": "appointments",
                    "key": "id"
                }
            },
            total_amount: {
                "type": Sequelize.DECIMAL(10,2),
                "allowNull": false
            },
            status: {
                "type": Sequelize.STRING,
                "allowNull": true
            },
            issued_at: {
                "type": Sequelize.DATE,
                "allowNull": true
            },
            created_at: {
              allowNull: false,
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
              allowNull: false,
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('invoices');
  }
};
