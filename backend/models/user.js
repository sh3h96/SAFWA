'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Vehicle, { foreignKey: 'client_id', as: 'vehicles' });
      User.belongsToMany(models.Vehicle, { through: models.VehicleUser, foreignKey: 'user_id', otherKey: 'vehicle_id', as: 'associatedVehicles' });
      User.hasMany(models.Appointment, { foreignKey: 'client_id', as: 'clientAppointments' });
      User.hasMany(models.Appointment, { foreignKey: 'mechanic_id', as: 'mechanicAppointments' });
      User.belongsToMany(models.Appointment, { through: models.AppointmentMechanic, as: 'assignedAppointments', foreignKey: 'mechanic_id', otherKey: 'appointment_id' });
      User.hasMany(models.TechnicalReport, { foreignKey: 'mechanic_id', as: 'reports' });
      User.hasMany(models.NewPartRequest, { foreignKey: 'mechanic_id', as: 'newPartRequests' });
      User.hasMany(models.Review, { foreignKey: 'client_id', as: 'reviews' });
      User.hasMany(models.AuditLog, { foreignKey: 'actor_user_id', as: 'auditLogs' });
    }
  }

  User.init({
    id: {
        "type": DataTypes.BIGINT,
        "primaryKey": true,
        "autoIncrement": true
    },
    name: {
        "type": DataTypes.STRING,
        "allowNull": false
    },
    email: {
        "type": DataTypes.STRING,
        "allowNull": false,
        "unique": true
    },
    password: {
        "type": DataTypes.STRING,
        "allowNull": false
    },
    phone: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    avatar_url: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    role: {
        "type": DataTypes.STRING,
        "allowNull": false
    },
    status: {
        "type": DataTypes.STRING,
        "allowNull": false,
        "defaultValue": 'active'
    },
    is_email_verified: {
        "type": DataTypes.BOOLEAN,
        "allowNull": false,
        "defaultValue": false
    },
    verification_token_hash: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    verification_token_expires_at: {
        "type": DataTypes.DATE,
        "allowNull": true
    },
    reset_token_hash: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    reset_token_expires_at: {
        "type": DataTypes.DATE,
        "allowNull": true
    },
    token_version: {
        "type": DataTypes.INTEGER,
        "allowNull": false,
        "defaultValue": 1
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User;
};
