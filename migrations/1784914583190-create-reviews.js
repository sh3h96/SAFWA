'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reviews', {
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
            client_id: {
                "type": Sequelize.BIGINT,
                "references": {
                    "model": "users",
                    "key": "id"
                }
            },
            rating: {
                "type": Sequelize.INTEGER,
                "allowNull": false
            },
            comment: {
                "type": Sequelize.TEXT,
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
    await queryInterface.dropTable('reviews');
  }
};
