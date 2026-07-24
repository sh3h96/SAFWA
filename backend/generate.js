const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');
const migrationsDir = path.join(__dirname, 'migrations');

// Create directories if they don't exist
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
if (!fs.existsSync(migrationsDir)) fs.mkdirSync(migrationsDir, { recursive: true });

const tables = [
  {
    name: 'users',
    modelName: 'User',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'name', type: 'Sequelize.STRING', allowNull: false },
      { name: 'email', type: 'Sequelize.STRING', allowNull: false, unique: true },
      { name: 'password', type: 'Sequelize.STRING', allowNull: false },
      { name: 'phone', type: 'Sequelize.STRING', allowNull: true },
      { name: 'role', type: 'Sequelize.STRING', allowNull: false }
    ]
  },
  {
    name: 'vehicles',
    modelName: 'Vehicle',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'client_id', type: 'Sequelize.BIGINT', references: { model: 'users', key: 'id' } },
      { name: 'make', type: 'Sequelize.STRING', allowNull: false },
      { name: 'model', type: 'Sequelize.STRING', allowNull: false },
      { name: 'license_plate', type: 'Sequelize.STRING', allowNull: false, unique: true }
    ]
  },
  {
    name: 'appointments',
    modelName: 'Appointment',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'client_id', type: 'Sequelize.BIGINT', references: { model: 'users', key: 'id' } },
      { name: 'vehicle_id', type: 'Sequelize.BIGINT', references: { model: 'vehicles', key: 'id' } },
      { name: 'mechanic_id', type: 'Sequelize.BIGINT', allowNull: true, references: { model: 'users', key: 'id' } },
      { name: 'problem_description', type: 'Sequelize.TEXT', allowNull: false },
      { name: 'status', type: 'Sequelize.STRING', allowNull: true },
      { name: 'scheduled_date', type: 'Sequelize.DATE', allowNull: true }
    ]
  },
  {
    name: 'technical_reports',
    modelName: 'TechnicalReport',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'appointment_id', type: 'Sequelize.BIGINT', references: { model: 'appointments', key: 'id' } },
      { name: 'mechanic_id', type: 'Sequelize.BIGINT', references: { model: 'users', key: 'id' } },
      { name: 'diagnostics', type: 'Sequelize.TEXT', allowNull: false },
      { name: 'mechanic_notes', type: 'Sequelize.TEXT', allowNull: true }
    ]
  },
  {
    name: 'spare_parts',
    modelName: 'SparePart',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'name', type: 'Sequelize.STRING', allowNull: false },
      { name: 'part_number', type: 'Sequelize.STRING', allowNull: true },
      { name: 'price', type: 'Sequelize.DECIMAL(10,2)', allowNull: false },
      { name: 'stock_quantity', type: 'Sequelize.INTEGER', allowNull: true }
    ]
  },
  {
    name: 'required_parts',
    modelName: 'RequiredPart',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'technical_report_id', type: 'Sequelize.BIGINT', references: { model: 'technical_reports', key: 'id' } },
      { name: 'part_id', type: 'Sequelize.BIGINT', references: { model: 'spare_parts', key: 'id' } },
      { name: 'quantity', type: 'Sequelize.INTEGER', allowNull: false },
      { name: 'status', type: 'Sequelize.STRING', allowNull: true }
    ]
  },
  {
    name: 'invoices',
    modelName: 'Invoice',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'appointment_id', type: 'Sequelize.BIGINT', references: { model: 'appointments', key: 'id' } },
      { name: 'total_amount', type: 'Sequelize.DECIMAL(10,2)', allowNull: false },
      { name: 'status', type: 'Sequelize.STRING', allowNull: true },
      { name: 'issued_at', type: 'Sequelize.DATE', allowNull: true }
    ]
  },
  {
    name: 'invoice_items',
    modelName: 'InvoiceItem',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'invoice_id', type: 'Sequelize.BIGINT', references: { model: 'invoices', key: 'id' } },
      { name: 'part_id', type: 'Sequelize.BIGINT', allowNull: true, references: { model: 'spare_parts', key: 'id' } },
      { name: 'description', type: 'Sequelize.STRING', allowNull: false },
      { name: 'quantity', type: 'Sequelize.INTEGER', allowNull: false },
      { name: 'unit_price', type: 'Sequelize.DECIMAL(10,2)', allowNull: false },
      { name: 'total_price', type: 'Sequelize.DECIMAL(10,2)', allowNull: false }
    ]
  },
  {
    name: 'payments',
    modelName: 'Payment',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'invoice_id', type: 'Sequelize.BIGINT', references: { model: 'invoices', key: 'id' } },
      { name: 'amount', type: 'Sequelize.DECIMAL(10,2)', allowNull: false },
      { name: 'payment_method', type: 'Sequelize.STRING', allowNull: false },
      { name: 'transaction_id', type: 'Sequelize.STRING', allowNull: true },
      { name: 'paid_at', type: 'Sequelize.DATE', allowNull: false }
    ]
  },
  {
    name: 'reviews',
    modelName: 'Review',
    fields: [
      { name: 'id', type: 'Sequelize.BIGINT', autoIncrement: true, primaryKey: true },
      { name: 'appointment_id', type: 'Sequelize.BIGINT', references: { model: 'appointments', key: 'id' } },
      { name: 'client_id', type: 'Sequelize.BIGINT', references: { model: 'users', key: 'id' } },
      { name: 'rating', type: 'Sequelize.INTEGER', allowNull: false },
      { name: 'comment', type: 'Sequelize.TEXT', allowNull: true }
    ]
  }
];

let timestamp = new Date().getTime();

tables.forEach((table, index) => {
  // Pad index to maintain order in migrations
  const currentTimestamp = timestamp + (index * 1000);
  const migrationName = `${currentTimestamp}-create-${table.name}.js`;
  const migrationPath = path.join(migrationsDir, migrationName);
  
  // Format fields for migration
  const migrationFields = table.fields.map(f => {
    let fieldObj = { type: f.type };
    if (f.primaryKey) fieldObj.primaryKey = true;
    if (f.autoIncrement) fieldObj.autoIncrement = true;
    if (f.allowNull !== undefined) fieldObj.allowNull = f.allowNull;
    if (f.unique) fieldObj.unique = true;
    if (f.references) fieldObj.references = f.references;
    
    // Stringify but remove quotes around Sequelize types
    let str = JSON.stringify(fieldObj, null, 4).replace(/"Sequelize\.([^"]+)"/g, 'Sequelize.$1');
    return `            ${f.name}: ${str.replace(/\n/g, '\n            ')}`;
  }).join(',\n');

  const migrationContent = `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('${table.name}', {
${migrationFields},
            created_at: {
              allowNull: false,
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
              allowNull: false,
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('${table.name}');
  }
};
`;
  fs.writeFileSync(migrationPath, migrationContent);

  // Format model fields
  const modelFields = table.fields.map(f => {
    let fieldObj = { type: f.type };
    if (f.primaryKey) fieldObj.primaryKey = true;
    if (f.autoIncrement) fieldObj.autoIncrement = true;
    if (f.allowNull !== undefined) fieldObj.allowNull = f.allowNull;
    if (f.unique) fieldObj.unique = true;
    if (f.references) fieldObj.references = f.references;

    let str = JSON.stringify(fieldObj, null, 4).replace(/"Sequelize\.([^"]+)"/g, 'DataTypes.$1');
    return `    ${f.name}: ${str.replace(/\n/g, '\n    ')}`;
  }).join(',\n');

  const modelContent = `'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ${table.modelName} extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  ${table.modelName}.init({
${modelFields}
  }, {
    sequelize,
    modelName: '${table.modelName}',
    tableName: '${table.name}',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return ${table.modelName};
};
`;
  
  const modelPath = path.join(modelsDir, `${table.modelName.toLowerCase()}.js`);
  fs.writeFileSync(modelPath, modelContent);
});

// Create models/index.js
const indexContent = `'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/database.js');
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = config;
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
`;
fs.writeFileSync(path.join(modelsDir, 'index.js'), indexContent);

console.log('Successfully generated models and migrations.');
