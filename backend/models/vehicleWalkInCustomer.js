'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class VehicleWalkInCustomer extends Model {
    static associate(models) {
      VehicleWalkInCustomer.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
      VehicleWalkInCustomer.belongsTo(models.WalkInCustomer, { foreignKey: 'walk_in_customer_id', as: 'walkInCustomer' });
    }
  }

  VehicleWalkInCustomer.init({
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
    walk_in_customer_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'walk_in_customers',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'VehicleWalkInCustomer',
    tableName: 'vehicle_walk_in_customers',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return VehicleWalkInCustomer;
};
