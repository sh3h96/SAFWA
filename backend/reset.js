require('dotenv').config();
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql'
});

sequelize.query("UPDATE appointments SET status = 'under_inspection' WHERE id = 63")
  .then(() => console.log('Updated to under_inspection'))
  .catch(console.error)
  .finally(() => sequelize.close());
