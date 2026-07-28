'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
            id: {
                "type": Sequelize.BIGINT,
                "primaryKey": true,
                "autoIncrement": true
            },
            invoice_id: {
                "type": Sequelize.BIGINT,
                "references": {
                    "model": "invoices",
                    "key": "id"
                }
            },
            amount: {
                "type": Sequelize.DECIMAL(10,2),
                "allowNull": false
            },
            payment_method: {
                "type": Sequelize.STRING,
                "allowNull": false
            },
            transaction_id: {
                "type": Sequelize.STRING,
                "allowNull": true
            },
            paid_at: {
                "type": Sequelize.DATE,
                "allowNull": false
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
    await queryInterface.dropTable('payments');
  }
};
