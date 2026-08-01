'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Appointment extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  Appointment.init({
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
    vehicle_id: {
        "type": DataTypes.BIGINT,
        "references": {
            "model": "vehicles",
            "key": "id"
        }
    },
    mechanic_id: {
        "type": DataTypes.BIGINT,
        "allowNull": true,
        "references": {
            "model": "users",
            "key": "id"
        }
    },
    problem_description: {
        "type": DataTypes.TEXT,
        "allowNull": false
    },
    status: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    scheduled_date: {
        "type": DataTypes.DATE,
        "allowNull": true
    }
  }, {
    sequelize,
    modelName: 'Appointment',
    tableName: 'appointments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Appointment;
};
