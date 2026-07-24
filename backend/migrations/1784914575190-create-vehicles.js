'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vehicles', {
            id: {
                "type": Sequelize.BIGINT,
                "primaryKey": true,
                "autoIncrement": true
            },
            client_id: {
                "type": Sequelize.BIGINT,
                "references": {
                    "model": "users",
                    "key": "id"
                }
            },
            make: {
                "type": Sequelize.STRING,
                "allowNull": false
            },
            model: {
                "type": Sequelize.STRING,
                "allowNull": false
            },
            license_plate: {
                "type": Sequelize.STRING,
                "allowNull": false,
                "unique": true
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
    await queryInterface.dropTable('vehicles');
  }
};
