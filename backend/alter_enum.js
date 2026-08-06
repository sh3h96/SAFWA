require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql'
});

async function run() {
  try {
    await sequelize.query("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending', 'awaiting_assignment', 'under_inspection', 'in_progress', 'waiting_parts', 'completed', 'cancelled')");
    console.log("ENUM updated successfully!");
  } catch (error) {
    console.error("Error updating ENUM:", error);
  } finally {
    await sequelize.close();
  }
}

run();
