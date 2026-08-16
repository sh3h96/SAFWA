'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class AppointmentMechanic extends Model {
    static associate(models) {
      AppointmentMechanic.belongsTo(models.Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
      AppointmentMechanic.belongsTo(models.User, { foreignKey: 'mechanic_id', as: 'mechanic' });
    }
  }

  AppointmentMechanic.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    appointment_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    mechanic_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AppointmentMechanic',
    tableName: 'appointment_mechanics',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return AppointmentMechanic;
};
