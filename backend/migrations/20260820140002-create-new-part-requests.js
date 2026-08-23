'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('new_part_requests', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      technical_report_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'technical_reports',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mechanic_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      part_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      vehicle_compatibility: {
        type: Sequelize.STRING,
        allowNull: true
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      created_spare_part_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'spare_parts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      rejection_reason: {
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

    await queryInterface.addIndex('new_part_requests', ['technical_report_id'], {
      name: 'idx_new_part_requests_tech_report'
    });
    await queryInterface.addIndex('new_part_requests', ['mechanic_id'], {
      name: 'idx_new_part_requests_mechanic'
    });
    await queryInterface.addIndex('new_part_requests', ['status'], {
      name: 'idx_new_part_requests_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('new_part_requests');
  }
};
