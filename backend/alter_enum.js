const { sequelize } = require('./models');

async function run() {
  try {
    await sequelize.query("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending', 'awaiting_assignment', 'under_inspection', 'in_progress', 'waiting_parts', 'ready_for_pickup', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'");
    console.log("ENUM updated successfully with ready_for_pickup!");
  } catch (error) {
    console.error("Error updating ENUM:", error);
  } finally {
    await sequelize.close();
  }
}

run();
