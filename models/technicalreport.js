'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TechnicalReport extends Model {
    static associate(models) {
      // Define associations here
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
