'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('required_parts', {
            id: {
                "type": Sequelize.BIGINT,
                "primaryKey": true,
                "autoIncrement": true
            },
            technical_report_id: {
                "type": Sequelize.BIGINT,
                "references": {
                    "model": "technical_reports",
                    "key": "id"
                }
            },
            part_id: {
                "type": Sequelize.BIGINT,
                "references": {
                    "model": "spare_parts",
                    "key": "id"
                }
            },
            quantity: {
                "type": Sequelize.INTEGER,
                "allowNull": false
            },
            status: {
                "type": Sequelize.STRING,
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
    await queryInterface.dropTable('required_parts');
  }
};
