const { RequiredPart, SparePart, TechnicalReport, Appointment, Vehicle, User, AppointmentMechanic } = require('../models');
const { logAudit } = require('../utils/auditLogger');
const InventoryService = require('../services/inventoryService');

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
                  { model: Vehicle, as: 'vehicle', attributes: ['id', 'make', 'model', 'license_plate', 'year'] },
                  { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
                  { model: User, as: 'mechanic', attributes: ['id', 'name', 'phone', 'email'] },
                  { model: User, as: 'mechanics', attributes: ['id', 'name', 'phone', 'email'], through: { attributes: [] } }
                ]
              },
              { model: User, as: 'mechanic', attributes: ['id', 'name', 'phone', 'email'] }
            ]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      const formatted = requests.map(reqItem => {
        const appt = reqItem.technicalReport?.appointment;
        const vehicle = appt?.vehicle;
        const customer = appt?.customer;
        const reportMechanic = reqItem.technicalReport?.mechanic;
        const apptMechanic = appt?.mechanic;
        const apptMechanics = appt?.mechanics || [];

        const assignedMechanics = apptMechanics.length > 0
          ? apptMechanics.map(m => ({ id: m.id, name: m.name }))
          : (reportMechanic ? [{ id: reportMechanic.id, name: reportMechanic.name }] : (apptMechanic ? [{ id: apptMechanic.id, name: apptMechanic.name }] : []));

        return {
          id: reqItem.id,
          part_id: reqItem.part_id,
          part: reqItem.partDetails ? {
            id: reqItem.partDetails.id,
            name: reqItem.partDetails.name,
            sku: reqItem.partDetails.part_number || '-',
            manufacturer: reqItem.partDetails.brand || 'غير محدد',
            purchasePrice: parseFloat(reqItem.partDetails.price || 0),
            stock: reqItem.partDetails.stock_quantity ?? 0,
            minStock: reqItem.partDetails.min_stock_level ?? 5,
            createdAt: reqItem.partDetails.created_at
          } : null,
          part_name: reqItem.partDetails?.name || 'غير معروف',
          sku: reqItem.partDetails?.part_number || '-',
          quantity: reqItem.quantity,
          status: reqItem.status || 'pending',
          current_stock: reqItem.partDetails?.stock_quantity ?? 0,
          unit_price: reqItem.partDetails?.price ? parseFloat(reqItem.partDetails.price) : 0,
          created_at: reqItem.created_at,
          appointment_id: reqItem.technicalReport?.appointment_id,
          vehicle_id: vehicle?.id || null,
          vehicle_info: vehicle
            ? `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`
            : 'غير محدد',
          vehicle: vehicle ? {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            license_plate: vehicle.license_plate,
            year: vehicle.year
          } : null,
          client_id: customer?.id || null,
          client_name: customer?.name || 'غير معروف',
          customer: customer ? {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email
          } : null,
          mechanic_id: assignedMechanics.length > 0 ? assignedMechanics[0].id : (reportMechanic?.id || null),
          mechanic_name: assignedMechanics.map(m => m.name).join('، ') || reportMechanic?.name || 'غير محدد',
          mechanics: assignedMechanics
        };
      });

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching required parts requests:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/required-parts
  submitRequest: async (req, res) => {
    try {
      let { appointment_id, technical_report_id, parts } = req.body;

      if (!appointment_id && technical_report_id) {
        const reportObj = await TechnicalReport.findByPk(technical_report_id);
        if (reportObj) {
          appointment_id = reportObj.appointment_id;
        }
      }

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

      // Strict validation for each part ID and positive integer quantity (> 0)
      for (const p of parts) {
        const partId = p.id !== undefined ? p.id : p.part_id;
        const qty = p.qty !== undefined ? p.qty : p.quantity;

        if (!partId || typeof qty !== 'number' || !Number.isInteger(qty) || qty <= 0) {
          return res.status(400).json({ message: 'Invalid quantity or part ID. Quantity must be a positive integer.' });
        }

        const sparePart = await SparePart.findByPk(partId);
        if (!sparePart) {
          return res.status(400).json({ message: `Spare part with ID ${partId} not found` });
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

      const records = parts.map(part => {
        const partId = part.id !== undefined ? part.id : part.part_id;
        const qty = part.qty !== undefined ? part.qty : part.quantity;
        return {
          technical_report_id: report.id,
          part_id: partId,
          quantity: qty,
          status: 'pending'
        };
      });

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

  // PUT /api/required-parts/:id/approval (Single Approve)
  approvePart: async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return res.status(403).json({ message: 'غير مصرح لك باعتماُ قطع الغيار' });
      }

      const result = await InventoryService.approveSingleRequiredPart({
        requiredPartId: req.params.id,
        price: req.body ? req.body.price : null,
        req
      });

      res.json({
        message: 'تم اعتماد قطعة الغيار وخصم الكمية من المخزون بنجاح',
        requiredPart: result.requiredPart,
        remainingStock: result.newStock
      });
    } catch (error) {
      const status = error.statusCode || 500;
      const responsePayload = { message: error.message };
      if (error.available !== undefined) responsePayload.available = error.available;
      if (error.requested !== undefined) responsePayload.requested = error.requested;
      res.status(status).json(responsePayload);
    }
  },

  // PUT /api/required-parts/:id/installation (Single Install)
  installPart: async (req, res) => {
    try {
      const result = await InventoryService.installSingleRequiredPart({
        requiredPartId: req.params.id,
        req
      });

      res.json({
        message: result.message,
        requiredPart: result.requiredPart
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ message: error.message });
    }
  },

  // PUT /api/required-parts/:id/rejection (Single Reject)
  rejectPart: async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return res.status(403).json({ message: 'غير مصرح لك برفض قطع الغيار' });
      }

      const result = await InventoryService.rejectSingleRequiredPart({
        requiredPartId: req.params.id,
        req
      });

      res.json({
        message: 'تم رفض طلب قطعة الغيار بنجاح',
        requiredPart: result.requiredPart
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ message: error.message });
    }
  },

  // PUT /api/required-parts/approval (Batch Decisions)
  updateApproval: async (req, res) => {
    try {
      const { decisions } = req.body;

      if (!decisions || !Array.isArray(decisions) || decisions.length === 0) {
        return res.status(400).json({ message: 'Decisions list is required' });
      }

      for (const decision of decisions) {
        if (decision.status === 'approved') {
          if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'غير مصرح لك باعتماُ قطع الغيار' });
          }
          await InventoryService.approveSingleRequiredPart({
            requiredPartId: decision.id,
            req
          });
        } else if (decision.status === 'installed') {
          await InventoryService.installSingleRequiredPart({
            requiredPartId: decision.id,
            req
          });
        } else if (decision.status === 'rejected') {
          if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'غير مصرح لك برفض قطع الغيار' });
          }
          await InventoryService.rejectSingleRequiredPart({
            requiredPartId: decision.id,
            req
          });
        } else {
          return res.status(400).json({ message: `الحالة غير صالحة: ${decision.status}` });
        }
      }

      res.json({ message: 'تم تحديث حالة طلبات قطع الغيار بنجاح' });
    } catch (error) {
      const status = error.statusCode || 500;
      const responsePayload = { message: error.message };
      if (error.available !== undefined) responsePayload.available = error.available;
      if (error.requested !== undefined) responsePayload.requested = error.requested;
      res.status(status).json(responsePayload);
    }
  }
};
