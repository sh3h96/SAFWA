'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class InvoiceItem extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  InvoiceItem.init({
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
    part_id: {
        "type": DataTypes.BIGINT,
        "allowNull": true,
        "references": {
            "model": "spare_parts",
            "key": "id"
        }
    },
    description: {
        "type": DataTypes.STRING,
        "allowNull": false
    },
    quantity: {
        "type": DataTypes.INTEGER,
        "allowNull": false
    },
    unit_price: {
        "type": DataTypes.DECIMAL(10,2),
        "allowNull": false
    },
    total_price: {
        "type": DataTypes.DECIMAL(10,2),
        "allowNull": false
    }
  }, {
    sequelize,
    modelName: 'InvoiceItem',
    tableName: 'invoice_items',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return InvoiceItem;
};
