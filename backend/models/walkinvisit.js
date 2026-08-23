'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class WalkInVisit extends Model {
    static associate(models) {
      WalkInVisit.belongsTo(models.WalkInCustomer, { foreignKey: 'walk_in_customer_id', as: 'customer' });
      WalkInVisit.belongsTo(models.Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
    }
  }

  WalkInVisit.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    walk_in_customer_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'walk_in_customers',
        key: 'id'
      }
    },
    vehicle_make: {
      type: DataTypes.STRING,
      allowNull: false
    },
    vehicle_model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    vehicle_year: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    vehicle_license_plate: {
      type: DataTypes.STRING,
      allowNull: true
    },
    vehicle_vin: {
      type: DataTypes.STRING,
      allowNull: true
    },
    vehicle_color: {
      type: DataTypes.STRING,
      allowNull: true
    },
    vehicle_transmission: {
      type: DataTypes.STRING,
      allowNull: true
    },
    vehicle_fuel_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    problem_description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    appointment_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'appointments',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'WalkInVisit',
    tableName: 'walk_in_visits',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_walk_in_visits_customer_id',
        fields: ['walk_in_customer_id']
      },
      {
        name: 'idx_walk_in_visits_status',
        fields: ['status']
      }
    ]
  });

  return WalkInVisit;
};
