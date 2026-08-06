'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SparePart extends Model {
    static associate(models) {
      SparePart.hasMany(models.RequiredPart, { foreignKey: 'part_id', as: 'requests' });
      SparePart.hasMany(models.InvoiceItem, { foreignKey: 'part_id', as: 'invoiceItems' });
    }
  }

  SparePart.init({
    id: {
        "type": DataTypes.BIGINT,
        "primaryKey": true,
        "autoIncrement": true
    },
    name: {
        "type": DataTypes.STRING,
        "allowNull": false
    },
    part_number: {
        "type": DataTypes.STRING,
        "allowNull": true
    },
    price: {
        "type": DataTypes.DECIMAL(10,2),
        "allowNull": false
    },
    stock_quantity: {
        "type": DataTypes.INTEGER,
        "allowNull": true
    },
    min_stock_level: {
        "type": DataTypes.INTEGER,
        "defaultValue": 5
    },
    brand: {
        "type": DataTypes.STRING,
        "allowNull": true
    }
  }, {
    sequelize,
    modelName: 'SparePart',
    tableName: 'spare_parts',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return SparePart;
};
