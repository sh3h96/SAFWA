'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('spare_parts', {
            id: {
                "type": Sequelize.BIGINT,
                "primaryKey": true,
                "autoIncrement": true
            },
            name: {
                "type": Sequelize.STRING,
                "allowNull": false
            },
            part_number: {
                "type": Sequelize.STRING,
                "allowNull": true
            },
            price: {
                "type": Sequelize.DECIMAL(10,2),
                "allowNull": false
            },
            stock_quantity: {
                "type": Sequelize.INTEGER,
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
    await queryInterface.dropTable('spare_parts');
  }
};
