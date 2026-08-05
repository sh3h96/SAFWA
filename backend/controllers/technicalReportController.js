const { TechnicalReport, Appointment } = require('../models');

module.exports = {
  // POST /api/reports
  createReport: async (req, res) => {
    try {
      const {
        appointment_id,
        diagnostics,
        mechanic_notes,
        odometer,
        obd2_codes,
        visual_notes,
        repair_plan,
        urgency_level
      } = req.body;

      const report = await TechnicalReport.create({
        appointment_id,
        mechanic_id: req.user.id,
        diagnostics: diagnostics || '',
        mechanic_notes,
        odometer,
        obd2_codes,
        visual_notes,
        repair_plan,
        urgency_level
      });

      // Status remains under_inspection until mechanic chooses Path A or Path B

      res.status(201).json({ message: 'Report created successfully', report });
    } catch (error) {
      console.error('Error creating technical report:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
