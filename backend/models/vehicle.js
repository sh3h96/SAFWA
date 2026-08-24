'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Vehicle extends Model {
    static associate(models) {
      Vehicle.belongsTo(models.User, { foreignKey: 'client_id', as: 'owner' });
      Vehicle.hasMany(models.Appointment, { foreignKey: 'vehicle_id', as: 'appointments' });
      Vehicle.hasMany(models.VehicleUser, { foreignKey: 'vehicle_id', as: 'userAssociations' });
      Vehicle.hasMany(models.VehicleWalkInCustomer, { foreignKey: 'vehicle_id', as: 'walkInCustomerAssociations' });
      Vehicle.hasMany(models.VehiclePlateHistory, { foreignKey: 'vehicle_id', as: 'plateHistory' });

      Vehicle.belongsToMany(models.User, {
        through: models.VehicleUser,
        foreignKey: 'vehicle_id',
        otherKey: 'user_id',
        as: 'associatedUsers'
      });

      Vehicle.belongsToMany(models.WalkInCustomer, {
        through: models.VehicleWalkInCustomer,
        foreignKey: 'vehicle_id',
        otherKey: 'walk_in_customer_id',
        as: 'associatedWalkInCustomers'
      });
    }
  }

  Vehicle.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    client_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    make: {
      type: DataTypes.STRING,
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    license_plate: {
      type: DataTypes.STRING,
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    vin: {
      type: DataTypes.STRING,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true
    },
    transmission: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fuel_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Vehicle',
    tableName: 'vehicles',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Vehicle;
};

