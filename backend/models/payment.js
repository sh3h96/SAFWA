'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
    }
  }

  Payment.init({
    id: {
        "type": DataTypes.BIGINT,
        "primaryKey": true,
        "autoIncrement": true
    },
    invoice_id: {
        "type": DataTypes.BIGINT,
        "references": {
            "model": "invoices",
            "key": "id"
        }
    },
    amount: {
        "type": DataTypes.DECIMAL(10,2),
        "allowNull": false
    },
    payment_method: {
        "type": DataTypes.STRING,
        "allowNull": false
    },
    transaction_id: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    paid_at: {
        "type": DataTypes.DATE,
        "allowNull": false
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Payment;
};
