const { Sequelize } = require('sequelize');

if (process.env.NODE_ENV === 'production') {
  const missingDbVars = ['DB_NAME', 'DB_USER', 'DB_HOST'].filter(varName => !process.env[varName]);
  if (missingDbVars.length > 0) {
    throw new Error(`FATAL: Missing mandatory database configuration in production: ${missingDbVars.join(', ')}`);
  }
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'safwa_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false, // Set to true to see SQL queries in console
  }
);

module.exports = sequelize;
