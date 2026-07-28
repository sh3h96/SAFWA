'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
            id: {
                "type": Sequelize.BIGINT,
                "primaryKey": true,
                "autoIncrement": true
            },
            name: {
                "type": Sequelize.STRING,
                "allowNull": false
            },
            email: {
                "type": Sequelize.STRING,
                "allowNull": false,
                "unique": true
            },
            password: {
                "type": Sequelize.STRING,
                "allowNull": false
            },
            phone: {
                "type": Sequelize.STRING,
                "allowNull": true
            },
            role: {
                "type": Sequelize.STRING,
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
    await queryInterface.dropTable('users');
  }
};
