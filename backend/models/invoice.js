'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Invoice extends Model {
    static associate(models) {
      Invoice.belongsTo(models.Appointment, { foreignKey: 'appointment_id' });
    }
  }

  Invoice.init({
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
    total_amount: {
        "type": DataTypes.DECIMAL(10,2),
        "allowNull": false
    },
    status: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    issued_at: {
        "type": DataTypes.DATE,
        "allowNull": true
    }
  }, {
    sequelize,
    modelName: 'Invoice',
    tableName: 'invoices',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Invoice;
};
