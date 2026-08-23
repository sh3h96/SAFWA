'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class WalkInCustomer extends Model {
    static associate(models) {
      WalkInCustomer.hasMany(models.WalkInVisit, { foreignKey: 'walk_in_customer_id', as: 'visits' });
      WalkInCustomer.belongsToMany(models.Vehicle, { through: models.VehicleWalkInCustomer, foreignKey: 'walk_in_customer_id', otherKey: 'vehicle_id', as: 'associatedVehicles' });
    }
  }

  WalkInCustomer.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'WalkInCustomer',
    tableName: 'walk_in_customers',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_walk_in_customers_phone',
        fields: ['phone']
      }
    ]
  });

  return WalkInCustomer;
};
