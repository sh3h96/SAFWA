'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Vehicle extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  Vehicle.init({
    id: {
        "type": DataTypes.BIGINT,
        "primaryKey": true,
        "autoIncrement": true
    },
    client_id: {
        "type": DataTypes.BIGINT,
        "references": {
            "model": "users",
            "key": "id"
        }
    },
    make: {
        "type": DataTypes.STRING,
        "allowNull": false
    },
    model: {
        "type": DataTypes.STRING,
        "allowNull": false
    },
    license_plate: {
        "type": DataTypes.STRING,
        "allowNull": false,
        "unique": true
    },
    year: {
        "type": DataTypes.INTEGER,
        "allowNull": true
    },
    vin: {
        "type": DataTypes.STRING,
        "allowNull": true
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
