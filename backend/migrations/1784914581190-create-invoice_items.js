'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoice_items', {
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
            part_id: {
                "type": Sequelize.BIGINT,
                "allowNull": true,
                "references": {
                    "model": "spare_parts",
                    "key": "id"
                }
            },
            description: {
                "type": Sequelize.STRING,
                "allowNull": false
            },
            quantity: {
                "type": Sequelize.INTEGER,
                "allowNull": false
            },
            unit_price: {
                "type": Sequelize.DECIMAL(10,2),
                "allowNull": false
            },
            total_price: {
                "type": Sequelize.DECIMAL(10,2),
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
    await queryInterface.dropTable('invoice_items');
  }
};
