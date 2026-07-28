'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SparePart extends Model {
    static associate(models) {
      // Define associations here
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
