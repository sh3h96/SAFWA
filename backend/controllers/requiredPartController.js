const { RequiredPart, SparePart, TechnicalReport, Appointment, Vehicle, User, AppointmentMechanic } = require('../models');
const { logAudit } = require('../utils/auditLogger');

module.exports = {
  // GET /api/required-parts
  getRequests: async (req, res) => {
    try {
      const { status, appointment_id } = req.query;

      let whereClause = {};
      if (status) {
        whereClause.status = status;
      }

      let reportWhere = {};
      if (appointment_id) {
        reportWhere.appointment_id = appointment_id;
      }

      // If mechanic, restrict to appointments assigned to mechanic
      if (req.user && req.user.role === 'mechanic') {
        const assignedAppts = await AppointmentMechanic.findAll({
          where: { mechanic_id: req.user.id },
          attributes: ['appointment_id']
        });
        const assignedApptIds = assignedAppts.map(a => a.appointment_id);

        const legacyAppts = await Appointment.findAll({
          where: { mechanic_id: req.user.id },
          attributes: ['id']
        });
        legacyAppts.forEach(a => {
          if (!assignedApptIds.includes(a.id)) assignedApptIds.push(a.id);
        });

        reportWhere.appointment_id = assignedApptIds;
      }

      const requests = await RequiredPart.findAll({
        where: whereClause,
        include: [
          {
            model: SparePart,
            as: 'partDetails'
          },
          {
            model: TechnicalReport,
            as: 'technicalReport',
            where: Object.keys(reportWhere).length > 0 ? reportWhere : undefined,
            include: [
              {
                model: Appointment,
                as: 'appointment',
                include: [
                  { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate', 'year'] },
                  { model: User, as: 'customer', attributes: ['name', 'phone'] }
                ]
              },
              { model: User, as: 'mechanic', attributes: ['id', 'name'] }
            ]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      const formatted = requests.map(reqItem => ({
        id: reqItem.id,
        part_id: reqItem.part_id,
        part_name: reqItem.partDetails?.name || 'غير معروف',
        sku: reqItem.partDetails?.part_number || '-',
        quantity: reqItem.quantity,
        status: reqItem.status || 'pending',
        current_stock: reqItem.partDetails?.stock_quantity ?? 0,
        unit_price: reqItem.partDetails?.price ? parseFloat(reqItem.partDetails.price) : 0,
        created_at: reqItem.created_at,
        appointment_id: reqItem.technicalReport?.appointment_id,
        vehicle_info: reqItem.technicalReport?.appointment?.vehicle
          ? `${reqItem.technicalReport.appointment.vehicle.make} ${reqItem.technicalReport.appointment.vehicle.model} (${reqItem.technicalReport.appointment.vehicle.license_plate})`
          : 'غير محدد',
        client_name: reqItem.technicalReport?.appointment?.customer?.name || 'غير معروف',
        mechanic_name: reqItem.technicalReport?.mechanic?.name || 'ميكانيكي'
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching required parts requests:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/required-parts
  submitRequest: async (req, res) => {
    try {
      const { appointment_id, parts } = req.body;

      if (!appointment_id || !parts || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({ message: 'Appointment ID and parts list are required' });
      }

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

      res.status(201).json({ message: 'Parts request submitted successfully', records: createdRecords });
    } catch (error) {
      console.error('Error submitting parts request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/required-parts/approval
  updateApproval: async (req, res) => {
    try {
      const { decisions } = req.body;

      if (!decisions || !Array.isArray(decisions) || decisions.length === 0) {
        return res.status(400).json({ message: 'Decisions list is required' });
      }

      // Pass 1: Stock verification for approvals
      for (const decision of decisions) {
        if (decision.status === 'approved') {
          const reqPart = await RequiredPart.findByPk(decision.id, {
            include: [{ model: SparePart, as: 'partDetails' }]
          });
          if (reqPart && reqPart.status !== 'approved') {
            const availableStock = reqPart.partDetails?.stock_quantity ?? 0;
            if (availableStock < reqPart.quantity) {
              return res.status(400).json({
                message: `المخزون غير كافٍ للقطعة "${reqPart.partDetails?.name || decision.id}". المتوفر: ${availableStock}، المطلوب: ${reqPart.quantity}`
              });
            }
          }
        }
      }

      // Pass 2: Execute updates & stock deduction
      for (const decision of decisions) {
        const oldPart = await RequiredPart.findByPk(decision.id, {
          include: [{ model: SparePart, as: 'partDetails' }]
        });
        const oldStatus = oldPart ? oldPart.status : 'pending';

        await RequiredPart.update(
          { status: decision.status },
          { where: { id: decision.id } }
        );

        if (decision.status === 'approved' && oldStatus !== 'approved' && oldPart?.partDetails) {
          const sparePart = await SparePart.findByPk(oldPart.part_id);
          if (sparePart) {
            const oldQty = sparePart.stock_quantity;
            const newQty = Math.max(0, sparePart.stock_quantity - oldPart.quantity);
            sparePart.stock_quantity = newQty;
            await sparePart.save();

            await logAudit({
              req,
              action: 'PART_STOCK_ADJUSTED',
              entityType: 'SparePart',
              entityId: sparePart.id,
              oldValues: { stock_quantity: oldQty },
              newValues: { stock_quantity: newQty }
            });
          }
        }

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
