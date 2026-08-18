'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Appointment extends Model {
    static associate(models) {
      Appointment.belongsTo(models.User, { as: 'customer', foreignKey: 'client_id' });
      Appointment.belongsTo(models.Vehicle, { as: 'vehicle', foreignKey: 'vehicle_id' });
      Appointment.belongsTo(models.User, { as: 'mechanic', foreignKey: 'mechanic_id' });
      Appointment.belongsToMany(models.User, { through: models.AppointmentMechanic, as: 'mechanics', foreignKey: 'appointment_id', otherKey: 'mechanic_id' });
      Appointment.hasMany(models.AppointmentMechanic, { foreignKey: 'appointment_id', as: 'appointmentMechanics' });
      Appointment.hasOne(models.Invoice, { foreignKey: 'appointment_id', as: 'invoice' });
      Appointment.hasOne(models.TechnicalReport, { foreignKey: 'appointment_id', as: 'report' });
      Appointment.hasOne(models.Review, { foreignKey: 'appointment_id', as: 'review' });
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
        type: DataTypes.ENUM('pending', 'awaiting_assignment', 'under_inspection', 'in_progress', 'waiting_parts', 'ready_for_pickup', 'completed', 'cancelled'),
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
