'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      actor_user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      entity_id: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true
      },
      new_values: {
        type: Sequelize.JSON,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Add indexes for high-frequency filtering queries
    await queryInterface.addIndex('audit_logs', ['actor_user_id'], { name: 'idx_audit_actor_user_id' });
    await queryInterface.addIndex('audit_logs', ['action'], { name: 'idx_audit_action' });
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id'], { name: 'idx_audit_entity' });
    await queryInterface.addIndex('audit_logs', ['created_at'], { name: 'idx_audit_created_at' });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  }
};
