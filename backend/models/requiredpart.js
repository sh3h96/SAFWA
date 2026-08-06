'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RequiredPart extends Model {
    static associate(models) {
      RequiredPart.belongsTo(models.SparePart, { foreignKey: 'part_id', as: 'partDetails' });
    }
  }

  RequiredPart.init({
    id: {
        "type": DataTypes.BIGINT,
        "primaryKey": true,
        "autoIncrement": true
    },
    technical_report_id: {
        "type": DataTypes.BIGINT,
        "references": {
            "model": "technical_reports",
            "key": "id"
        }
    },
    part_id: {
        "type": DataTypes.BIGINT,
        "references": {
            "model": "spare_parts",
            "key": "id"
        }
    },
    quantity: {
        "type": DataTypes.INTEGER,
        "allowNull": false
    },
    status: {
        "type": DataTypes.STRING,
        "allowNull": true
    }
  }, {
    sequelize,
    modelName: 'RequiredPart',
    tableName: 'required_parts',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return RequiredPart;
};
