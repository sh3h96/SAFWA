const { RequiredPart } = require('../models');

module.exports = {
  // POST /api/required-parts
  submitRequest: async (req, res) => {
    try {
      const { appointment_id, parts } = req.body;
      
      // In a real app, you would first find the technical_report_id for this appointment
      // For simplicity here, if there's no technical report yet, we might use appointment_id directly if we altered the model,
      // but our model requires technical_report_id. 
      // Let's assume the frontend passes technical_report_id or we look it up.
      // We will look it up:
      const { TechnicalReport } = require('../models');
      let report = await TechnicalReport.findOne({ where: { appointment_id } });
      
      if (!report) {
        // Auto-create a stub report if they bypassed the formal diagnosis step
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

      await RequiredPart.bulkCreate(records);

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
      // decisions: [{ id: 1, status: 'approved' }, { id: 2, status: 'rejected' }]
      
      const { RequiredPart } = require('../models');
      
      for (const decision of decisions) {
        await RequiredPart.update(
          { status: decision.status },
          { where: { id: decision.id } }
        );
      }
      
      res.json({ message: 'Parts approval updated successfully' });
    } catch (error) {
      console.error('Error updating parts approval:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
