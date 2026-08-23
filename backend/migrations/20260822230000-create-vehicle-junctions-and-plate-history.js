'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Create vehicle_users table
    try {
      await queryInterface.createTable('vehicle_users', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        vehicle_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'vehicles',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
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
      await queryInterface.addConstraint('vehicle_users', {
        fields: ['vehicle_id', 'user_id'],
        type: 'unique',
        name: 'idx_vehicle_users_unique'
      });
    } catch (e) {
      console.log('vehicle_users table or constraint already exists, skipping.');
    }

    // 2. Create vehicle_walk_in_customers table
    try {
      await queryInterface.createTable('vehicle_walk_in_customers', {
        id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        vehicle_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'vehicles',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
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
      await queryInterface.addConstraint('vehicle_walk_in_customers', {
        fields: ['vehicle_id', 'walk_in_customer_id'],
        type: 'unique',
        name: 'idx_vehicle_walk_in_unique'
      });
    } catch (e) {
      console.log('vehicle_walk_in_customers table or constraint already exists, skipping.');
    }

    // 3. Create vehicle_plate_history table
    await queryInterface.createTable('vehicle_plate_history', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      vehicle_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'vehicles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      license_plate: {
        type: Sequelize.STRING,
        allowNull: false
      },
      start_date: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      end_date: {
        allowNull: true,
        type: Sequelize.DATE
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      change_reason: {
        type: Sequelize.STRING,
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

    // 4. Add color, transmission, fuel_type columns to vehicles table if they don't exist
    const tableInfo = await queryInterface.describeTable('vehicles');
    if (!tableInfo.color) {
      await queryInterface.addColumn('vehicles', 'color', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    if (!tableInfo.transmission) {
      await queryInterface.addColumn('vehicles', 'transmission', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    if (!tableInfo.fuel_type) {
      await queryInterface.addColumn('vehicles', 'fuel_type', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // 5. Data Backfill: Populate vehicle_users from existing vehicles.client_id
    const [vehiclesWithClients] = await queryInterface.sequelize.query(
      `SELECT id, client_id, created_at, updated_at FROM vehicles WHERE client_id IS NOT NULL;`
    );
    if (vehiclesWithClients.length > 0) {
      for (const v of vehiclesWithClients) {
        await queryInterface.sequelize.query(
          `INSERT INTO vehicle_users (vehicle_id, user_id, created_at, updated_at)
           VALUES (${v.id}, ${v.client_id}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT DO NOTHING;`
        ).catch(() => {});
      }
    }

    // 6. Data Backfill: Populate vehicle_walk_in_customers from existing walk_in_visits & appointments
    const [walkInVisits] = await queryInterface.sequelize.query(
      `SELECT w.walk_in_customer_id, a.vehicle_id, w.created_at
       FROM walk_in_visits w
       JOIN appointments a ON w.appointment_id = a.id
       WHERE w.walk_in_customer_id IS NOT NULL AND a.vehicle_id IS NOT NULL;`
    );
    if (walkInVisits.length > 0) {
      for (const w of walkInVisits) {
        await queryInterface.sequelize.query(
          `INSERT INTO vehicle_walk_in_customers (vehicle_id, walk_in_customer_id, created_at, updated_at)
           VALUES (${w.vehicle_id}, ${w.walk_in_customer_id}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT DO NOTHING;`
        ).catch(() => {});
      }
    }

    // 7. Data Backfill: Populate initial vehicle_plate_history entries
    const [allVehicles] = await queryInterface.sequelize.query(
      `SELECT id, license_plate, created_at, updated_at FROM vehicles WHERE license_plate IS NOT NULL AND license_plate != '';`
    );
    if (allVehicles.length > 0) {
      for (const v of allVehicles) {
        await queryInterface.sequelize.query(
          `INSERT INTO vehicle_plate_history (vehicle_id, license_plate, start_date, is_active, change_reason, created_at, updated_at)
           VALUES (${v.id}, '${v.license_plate}', CURRENT_TIMESTAMP, 1, 'INITIAL_REGISTRATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`
        ).catch(() => {});
      }
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('vehicle_plate_history').catch(() => {});
    await queryInterface.dropTable('vehicle_walk_in_customers').catch(() => {});
    await queryInterface.dropTable('vehicle_users').catch(() => {});
    await queryInterface.removeColumn('vehicles', 'color').catch(() => {});
    await queryInterface.removeColumn('vehicles', 'transmission').catch(() => {});
    await queryInterface.removeColumn('vehicles', 'fuel_type').catch(() => {});
  }
};
