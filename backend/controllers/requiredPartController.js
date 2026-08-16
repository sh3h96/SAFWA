const { RequiredPart } = require('../models');
const { logAudit } = require('../utils/auditLogger');

module.exports = {
  // POST /api/required-parts
  submitRequest: async (req, res) => {
    try {
      const { appointment_id, parts } = req.body;
      
      const { TechnicalReport, Appointment, AppointmentMechanic } = require('../models');
      const appt = await Appointment.findByPk(appointment_id);
      if (!appt) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Assignment Verification: Mechanic must be assigned to appointment to submit parts requests
      if (req.user && req.user.role === 'mechanic') {
        let isAssigned = appt.mechanic_id === req.user.id;
        if (!isAssigned) {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: appt.id, mechanic_id: req.user.id }
          });
          if (amRecord) isAssigned = true;
        }
        if (!isAssigned) {
          return res.status(404).json({ message: 'Appointment not found or unauthorized' });
        }
      }

      let report = await TechnicalReport.findOne({ where: { appointment_id } });

      
      if (!report) {
        report = await TechnicalReport.create({
          appointment_id,
          mechanic_id: req.user.id,
          diagnostics: 'تم طلب قطع مباشرة بدون تقرير فحص فني',
        });
      }

      const records = parts.map(part => ({
        technical_report_id: report.id,
        part_id: part.id,
        quantity: part.qty,
        status: 'pending'
      }));

      const createdRecords = await RequiredPart.bulkCreate(records);

      await logAudit({
        req,
        action: 'PARTS_REQUEST_SUBMITTED',
        entityType: 'TechnicalReport',
        entityId: report.id,
        newValues: { appointment_id, parts_requested_count: parts.length, parts }
      });

      res.status(201).json({ message: 'Parts request submitted successfully' });
    } catch (error) {
      console.error('Error submitting parts request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/required-parts/approval
  updateApproval: async (req, res) => {
    try {
      const { decisions } = req.body;
      
      const { RequiredPart } = require('../models');
      
      for (const decision of decisions) {
        const oldPart = await RequiredPart.findByPk(decision.id);
        const oldStatus = oldPart ? oldPart.status : 'pending';

        await RequiredPart.update(
          { status: decision.status },
          { where: { id: decision.id } }
        );

        const auditAction = decision.status === 'approved' ? 'PARTS_REQUEST_APPROVED' : (decision.status === 'rejected' ? 'PARTS_REQUEST_REJECTED' : 'PARTS_REQUEST_UPDATED');
        await logAudit({
          req,
          action: auditAction,
          entityType: 'RequiredPart',
          entityId: decision.id,
          oldValues: { status: oldStatus },
          newValues: { status: decision.status }
        });
      }
      
      res.json({ message: 'Parts approval updated successfully' });
    } catch (error) {
      console.error('Error updating parts approval:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
