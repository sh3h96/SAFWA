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

      // Strict validation for each part ID and positive quantity (> 0)
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

  // PUT /api/required-parts/approval
  updateApproval: async (req, res) => {
    const { sequelize, SparePart, RequiredPart } = require('../models');
    const transaction = await sequelize.transaction();
    try {
      const { decisions } = req.body;

      if (!decisions || !Array.isArray(decisions) || decisions.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Decisions list is required' });
      }

      // Pass 1: Strict Validation with Row Locking
      for (const decision of decisions) {
        if (!decision.status || !['approved', 'rejected', 'installed', 'pending'].includes(decision.status)) {
          await transaction.rollback();
          return res.status(400).json({ message: `Invalid status decision: ${decision.status}` });
        }

        const reqPart = await RequiredPart.findByPk(decision.id, {
          include: [{ model: SparePart, as: 'partDetails' }],
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!reqPart) {
          await transaction.rollback();
          return res.status(404).json({ message: `Required parts request #${decision.id} not found` });
        }

        if (decision.status === 'approved') {
          if (reqPart.status === 'rejected') {
            await transaction.rollback();
            return res.status(400).json({ message: `Cannot approve an already rejected parts request (ID: ${decision.id})` });
          }

          if (reqPart.status !== 'approved') {
            const sparePart = await SparePart.findByPk(reqPart.part_id, {
              transaction,
              lock: transaction.LOCK.UPDATE
            });
            const availableStock = sparePart?.stock_quantity ?? 0;
            if (availableStock < reqPart.quantity) {
              await transaction.rollback();
              return res.status(400).json({
                message: `المخزون غير كافٍ للقطعة "${reqPart.partDetails?.name || decision.id}". المتوفر: ${availableStock}، المطلوب: ${reqPart.quantity}`
              });
            }
          }
        }

        if (decision.status === 'installed') {
          if (reqPart.status !== 'approved' && reqPart.status !== 'installed') {
            await transaction.rollback();
            return res.status(400).json({ message: `لا يمكن تركيب القطعة إلا بعد اعتمادها أولاً (ID: ${decision.id})` });
          }
        }
      }

      // Pass 2: Execute updates & stock adjustments
      for (const decision of decisions) {
        const oldPart = await RequiredPart.findByPk(decision.id, {
          include: [{ model: SparePart, as: 'partDetails' }],
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        const oldStatus = oldPart ? oldPart.status : 'pending';

        await RequiredPart.update(
          { status: decision.status },
          { where: { id: decision.id }, transaction }
        );

        // Scenario A: Transitioning to 'approved' for the first time -> Deduct Stock
        if (decision.status === 'approved' && oldStatus !== 'approved' && oldPart?.partDetails) {
          const sparePart = await SparePart.findByPk(oldPart.part_id, {
            transaction,
            lock: transaction.LOCK.UPDATE
          });
          if (sparePart) {
            const oldQty = sparePart.stock_quantity;
            const newQty = Math.max(0, sparePart.stock_quantity - oldPart.quantity);
            sparePart.stock_quantity = newQty;
            await sparePart.save({ transaction });

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

        // Scenario B: Transitioning to 'rejected' from 'approved' -> Restore Previously Deducted Stock
        if (decision.status === 'rejected' && oldStatus === 'approved' && oldPart?.partDetails) {
          const sparePart = await SparePart.findByPk(oldPart.part_id, {
            transaction,
            lock: transaction.LOCK.UPDATE
          });
          if (sparePart) {
            const oldQty = sparePart.stock_quantity;
            const newQty = sparePart.stock_quantity + oldPart.quantity;
            sparePart.stock_quantity = newQty;
            await sparePart.save({ transaction });

            await logAudit({
              req,
              action: 'PART_STOCK_RESTORED',
              entityType: 'SparePart',
              entityId: sparePart.id,
              oldValues: { stock_quantity: oldQty },
              newValues: { stock_quantity: newQty }
            });
          }
        }

        // Scenario C: Transitioning to 'installed' -> No stock change needed (stock was already deducted at 'approved')

        const auditAction = decision.status === 'approved' ? 'PARTS_REQUEST_APPROVED'
          : (decision.status === 'rejected' ? 'PARTS_REQUEST_REJECTED'
          : (decision.status === 'installed' ? 'PARTS_REQUEST_INSTALLED' : 'PARTS_REQUEST_UPDATED'));

        await logAudit({
          req,
          action: auditAction,
          entityType: 'RequiredPart',
          entityId: decision.id,
          oldValues: { status: oldStatus },
          newValues: { status: decision.status }
        });
      }

      await transaction.commit();
      res.json({ message: 'تم تحديث حالة طلب قطعة الغيار بنجاح' });
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating parts approval:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
