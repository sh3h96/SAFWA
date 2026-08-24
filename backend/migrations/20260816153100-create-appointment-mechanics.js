'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('appointment_mechanics', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      appointment_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'appointments',
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
      assigned_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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

    // Add unique constraint so a mechanic is not assigned twice to the same appointment
    await queryInterface.addConstraint('appointment_mechanics', {
      fields: ['appointment_id', 'mechanic_id'],
      type: 'unique',
      name: 'unique_appointment_mechanic_pair'
    });

    // Data Sync: Populate appointment_mechanics from existing appointments.mechanic_id
    const [appointments] = await queryInterface.sequelize.query(
      `SELECT id, mechanic_id FROM appointments WHERE mechanic_id IS NOT NULL;`
    );

    if (appointments.length > 0) {
      const records = appointments.map(app => ({
        appointment_id: app.id,
        mechanic_id: app.mechanic_id,
        assigned_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }));

      await queryInterface.bulkInsert('appointment_mechanics', records, {});
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('appointment_mechanics');
  }
};
