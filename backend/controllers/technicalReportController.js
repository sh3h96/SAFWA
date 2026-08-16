const { TechnicalReport, Appointment } = require('../models');
const { logAudit } = require('../utils/auditLogger');

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
        const { AppointmentMechanic } = require('../models');
        let isAssigned = appointment.mechanic_id === req.user.id;
        if (!isAssigned) {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: appointment.id, mechanic_id: req.user.id }
          });
          if (amRecord) isAssigned = true;
        }

        if (!isAssigned) {
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

      await logAudit({
        req,
        action: 'TECHNICAL_REPORT_CREATED',
        entityType: 'TechnicalReport',
        entityId: report.id,
        newValues: {
          appointment_id,
          mechanic_id: req.user.id,
          diagnostics,
          odometer,
          repair_plan
        }
      });

      res.status(201).json({ message: 'Report created successfully', report });
    } catch (error) {
      console.error('Error creating technical report:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
