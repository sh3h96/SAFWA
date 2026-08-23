'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class NewPartRequest extends Model {
    static associate(models) {
      NewPartRequest.belongsTo(models.TechnicalReport, { foreignKey: 'technical_report_id', as: 'technicalReport' });
      NewPartRequest.belongsTo(models.User, { foreignKey: 'mechanic_id', as: 'mechanic' });
      NewPartRequest.belongsTo(models.SparePart, { foreignKey: 'created_spare_part_id', as: 'createdSparePart' });
    }
  }

  NewPartRequest.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    technical_report_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'technical_reports',
        key: 'id'
      }
    },
    mechanic_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    part_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vehicle_compatibility: {
      type: DataTypes.STRING,
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    created_spare_part_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'spare_parts',
        key: 'id'
      }
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'NewPartRequest',
    tableName: 'new_part_requests',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_new_part_requests_tech_report',
        fields: ['technical_report_id']
      },
      {
        name: 'idx_new_part_requests_mechanic',
        fields: ['mechanic_id']
      },
      {
        name: 'idx_new_part_requests_status',
        fields: ['status']
      }
    ]
  });

  return NewPartRequest;
};
