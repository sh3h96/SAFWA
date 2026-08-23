'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class VehicleUser extends Model {
    static associate(models) {
      VehicleUser.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
      VehicleUser.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  VehicleUser.init({
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
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'VehicleUser',
    tableName: 'vehicle_users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return VehicleUser;
};
