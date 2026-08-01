'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('appointments', {
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
            vehicle_id: {
                "type": Sequelize.BIGINT,
                "references": {
                    "model": "vehicles",
                    "key": "id"
                }
            },
            mechanic_id: {
                "type": Sequelize.BIGINT,
                "allowNull": true,
                "references": {
                    "model": "users",
                    "key": "id"
                }
            },
            problem_description: {
                "type": Sequelize.TEXT,
                "allowNull": false
            },
            status: {
                "type": Sequelize.STRING,
                "allowNull": true
            },
            scheduled_date: {
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
    await queryInterface.dropTable('appointments');
  }
};
