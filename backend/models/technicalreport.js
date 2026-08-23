'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TechnicalReport extends Model {
    static associate(models) {
      TechnicalReport.belongsTo(models.Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
      TechnicalReport.belongsTo(models.User, { as: 'mechanic', foreignKey: 'mechanic_id' });
      TechnicalReport.hasMany(models.RequiredPart, { foreignKey: 'technical_report_id', as: 'requestedParts' });
      TechnicalReport.hasMany(models.NewPartRequest, { foreignKey: 'technical_report_id', as: 'newPartRequests' });
    }
  }

  TechnicalReport.init({
    id: {
        "type": DataTypes.BIGINT,
        "primaryKey": true,
        "autoIncrement": true
    },
    appointment_id: {
        "type": DataTypes.BIGINT,
        "references": {
            "model": "appointments",
            "key": "id"
        }
    },
    mechanic_id: {
        "type": DataTypes.BIGINT,
        "references": {
            "model": "users",
            "key": "id"
        }
    },
    diagnostics: {
        "type": DataTypes.TEXT,
        "allowNull": false
    },
    mechanic_notes: {
        "type": DataTypes.TEXT,
        "allowNull": true
    },
    odometer: {
        "type": DataTypes.INTEGER,
        "allowNull": true
    },
    obd2_codes: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    visual_notes: {
        "type": DataTypes.TEXT,
        "allowNull": true
    },
    repair_plan: {
        "type": DataTypes.TEXT,
        "allowNull": true
    },
    urgency_level: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    estimated_labor_cost: {
        "type": DataTypes.DECIMAL(10,2),
        "allowNull": true
    }
  }, {
    sequelize,
    modelName: 'TechnicalReport',
    tableName: 'technical_reports',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return TechnicalReport;
};
