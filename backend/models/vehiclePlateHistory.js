'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class VehiclePlateHistory extends Model {
    static associate(models) {
      VehiclePlateHistory.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
    }
  }

  VehiclePlateHistory.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    vehicle_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'vehicles',
        key: 'id'
      }
    },
    license_plate: {
      type: DataTypes.STRING,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    change_reason: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'VehiclePlateHistory',
    tableName: 'vehicle_plate_history',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return VehiclePlateHistory;
};
