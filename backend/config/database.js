const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'safwa_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '62130137',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false, // Set to true to see SQL queries in console
  }
);

module.exports = sequelize;
