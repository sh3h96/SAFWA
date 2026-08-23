'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('walk_in_visits', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      walk_in_customer_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'walk_in_customers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      vehicle_make: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vehicle_model: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vehicle_year: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      vehicle_license_plate: {
        type: Sequelize.STRING,
        allowNull: true
      },
      vehicle_vin: {
        type: Sequelize.STRING,
        allowNull: true
      },
      vehicle_color: {
        type: Sequelize.STRING,
        allowNull: true
      },
      problem_description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      appointment_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'appointments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notes: {
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

    await queryInterface.addIndex('walk_in_visits', ['walk_in_customer_id'], {
      name: 'idx_walk_in_visits_customer_id'
    });
    await queryInterface.addIndex('walk_in_visits', ['status'], {
      name: 'idx_walk_in_visits_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('walk_in_visits');
  }
};
