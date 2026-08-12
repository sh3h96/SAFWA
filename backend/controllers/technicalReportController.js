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

      if (!appointment_id) {
        return res.status(400).json({ message: 'appointment_id is required' });
      }

      const appointment = await Appointment.findByPk(appointment_id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Assignment Verification: Mechanic can only create technical report for their assigned appointment
      if (req.user && req.user.role === 'mechanic') {
        if (appointment.mechanic_id !== req.user.id) {
          return res.status(404).json({ message: 'Appointment not found' });
        }
      }

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
