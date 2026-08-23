'use strict';

const { TechnicalReport, Appointment, Vehicle, User, RequiredPart, SparePart, AppointmentMechanic, sequelize } = require('../models');
const { logAudit } = require('../utils/auditLogger');

const VALID_URGENCY_LEVELS = ['low', 'medium', 'high', 'critical', 'ضعيف', 'متوسط', 'عالي', 'حرج'];

module.exports = {
  // POST /api/technical-reports
  createReport: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const {
        appointment_id,
        diagnostics,
        diagnosis,
        mechanic_notes,
        odometer,
        obd2_codes,
        visual_notes,
        repair_plan,
        urgency_level,
        estimated_labor_cost,
        labor_cost,
        requested_parts,
        parts
      } = req.body;

      const targetApptId = appointment_id;
      const targetDiag = diagnostics !== undefined ? diagnostics : diagnosis;
      const targetLabor = estimated_labor_cost !== undefined ? estimated_labor_cost : labor_cost;
      const targetParts = requested_parts || parts;

      if (!targetApptId) {
        await transaction.rollback();
        return res.status(400).json({ message: 'appointment_id is required' });
      }

      // 1. Validation: Diagnostics mandatory and non-empty string
      if (!targetDiag || typeof targetDiag !== 'string' || !targetDiag.trim()) {
        await transaction.rollback();
        return res.status(400).json({ message: 'التشخيص الفني مطلوب' });
      }

      // 2. Validation: Odometer
      if (odometer !== undefined && odometer !== null && odometer !== '') {
        const numOdo = Number(odometer);
        if (isNaN(numOdo) || !Number.isInteger(numOdo) || numOdo < 0) {
          await transaction.rollback();
          return res.status(400).json({ message: 'قراءة العداد يجب أن تكون رقماً موجباً' });
        }
      }

      // 3. Validation: Urgency Level
      if (urgency_level) {
        if (!VALID_URGENCY_LEVELS.includes(urgency_level.toString().toLowerCase())) {
          await transaction.rollback();
          return res.status(400).json({ message: 'مستوى الأهمية غير صالح' });
        }
      }

      // 4. Validation: Estimated Labor Cost
      if (targetLabor !== undefined && targetLabor !== null && targetLabor !== '') {
        const numLabor = Number(targetLabor);
        if (isNaN(numLabor) || numLabor < 0) {
          await transaction.rollback();
          return res.status(400).json({ message: 'التكلفة التقديرية لأجور العمل يجب أن تكون رقماً موجباً' });
        }
      }

      // 5. Appointment Existence & Ownership
      const appointment = await Appointment.findByPk(targetApptId, { transaction });
      if (!appointment) {
        await transaction.rollback();
        return res.status(404).json({ message: 'الموعد غير موجود' });
      }

      // 6. Appointment State Restriction: Creation is ONLY allowed when under_inspection
      if (appointment.status !== 'under_inspection') {
        await transaction.rollback();
        if (appointment.status === 'pending' || appointment.status === 'awaiting_assignment') {
          return res.status(400).json({ message: 'لا يمكن إنشاء التقرير الفني قبل الوصول لمرحلة الفحص (under_inspection)' });
        }
        if (appointment.status === 'in_progress') {
          return res.status(400).json({ message: 'لا يمكن إنشاء تقرير فني جديد بعد بدء عملية الإصلاح' });
        }
        if (appointment.status === 'completed' || appointment.status === 'cancelled') {
          return res.status(400).json({ message: 'لا يمكن إنشاء تقرير فني لموعد مكتمل أو ملغى' });
        }
        return res.status(400).json({ message: `الموعد في حالة (${appointment.status}) وليس في حالة الفحص` });
      }

      // 7. Authorization Check: Mechanic must be assigned to appointment
      let isAssignedMechanic = false;
      if (req.user && req.user.role === 'mechanic') {
        if (appointment.mechanic_id === req.user.id) {
          isAssignedMechanic = true;
        } else {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: appointment.id, mechanic_id: req.user.id },
            transaction
          });
          if (amRecord) isAssignedMechanic = true;
        }

        if (!isAssignedMechanic) {
          await transaction.rollback();
          return res.status(403).json({ message: 'غير مصرح لك بإنشاء تقرير فني لموعد غير مسند إليك' });
        }
      }

      // Source of truth for mechanic ID: authenticated identity or primary assigned mechanic
      const reportingMechanicId = (req.user && req.user.id) ? req.user.id : (appointment.mechanic_id || null);

      // 8. One Technical Report per Appointment Guard (Reject Duplicate Report Creation)
      const existingReport = await TechnicalReport.findOne({
        where: { appointment_id: targetApptId },
        transaction
      });

      if (existingReport) {
        await transaction.rollback();
        return res.status(409).json({ message: 'يوجد بالفعل تقرير فني مرتبط بهذا الموعد. يرجى التعديل من خلال endpoint التحديث.' });
      }

      // 9. Create Technical Report
      const newReport = await TechnicalReport.create({
        appointment_id: targetApptId,
        mechanic_id: reportingMechanicId,
        diagnostics: targetDiag.trim(),
        mechanic_notes: mechanic_notes ? mechanic_notes.trim() : null,
        odometer: odometer !== undefined && odometer !== null && odometer !== '' ? Number(odometer) : null,
        obd2_codes: obd2_codes ? obd2_codes.trim() : null,
        visual_notes: visual_notes ? visual_notes.trim() : null,
        repair_plan: repair_plan ? repair_plan.trim() : null,
        urgency_level: urgency_level ? urgency_level.toString().toLowerCase() : 'medium',
        estimated_labor_cost: targetLabor !== undefined && targetLabor !== null && targetLabor !== '' ? Number(targetLabor) : null
      }, { transaction });

      // 10. Handle optional Required Parts
      let createdParts = [];
      if (Array.isArray(targetParts) && targetParts.length > 0) {
        for (const p of targetParts) {
          const partId = p.id !== undefined ? p.id : p.part_id;
          const qty = p.qty !== undefined ? p.qty : p.quantity;

          if (!partId || typeof qty !== 'number' || !Number.isInteger(qty) || qty <= 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'الكمية أو معرف قطعة الغيار غير صالح' });
          }

          const sparePart = await SparePart.findByPk(partId, { transaction });
          if (!sparePart) {
            await transaction.rollback();
            return res.status(400).json({ message: `قطعة الغيار ذات المعرف ${partId} غير موجودة` });
          }
        }

        const partRecords = targetParts.map(p => ({
          technical_report_id: newReport.id,
          part_id: p.id !== undefined ? p.id : p.part_id,
          quantity: p.qty !== undefined ? p.qty : p.quantity,
          status: 'pending'
        }));

        createdParts = await RequiredPart.bulkCreate(partRecords, { transaction });
      }

      await transaction.commit();

      await logAudit({
        req,
        action: 'TECHNICAL_REPORT_CREATED',
        entityType: 'TechnicalReport',
        entityId: newReport.id,
        newValues: {
          appointment_id: targetApptId,
          mechanic_id: reportingMechanicId,
          diagnostics: newReport.diagnostics,
          estimated_labor_cost: newReport.estimated_labor_cost,
          parts_count: createdParts.length
        }
      });

      const reportWithDetails = await TechnicalReport.findByPk(newReport.id, {
        include: [
          { model: RequiredPart, as: 'requestedParts', include: [{ model: SparePart, as: 'partDetails' }] },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'phone'] }
        ]
      });

      res.status(201).json({
        message: 'تم إنشاء التقرير الفني بنجاح',
        report: reportWithDetails
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error creating technical report:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/technical-reports/:id
  updateReport: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const report = await TechnicalReport.findByPk(req.params.id, { transaction });
      if (!report) {
        await transaction.rollback();
        return res.status(404).json({ message: 'التقرير الفني غير موجود' });
      }

      const appointment = await Appointment.findByPk(report.appointment_id, { transaction });
      if (!appointment) {
        await transaction.rollback();
        return res.status(404).json({ message: 'الموعد المرتبط بالتقرير غير موجود' });
      }

      // Appointment State Guard for Editing:
      if (appointment.status === 'in_progress') {
        await transaction.rollback();
        return res.status(400).json({ message: 'لا يمكن تعديل التقرير الفني أثناء تنفيذ الصيانة (in_progress)' });
      }
      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        await transaction.rollback();
        return res.status(400).json({ message: 'لا يمكن التعديل على تقرير فني لموعد مكتمل أو ملغى' });
      }
      if (appointment.status !== 'under_inspection') {
        await transaction.rollback();
        return res.status(400).json({ message: 'لا يمكن تعديل التقرير الفني خارج مرحلة الفحص' });
      }

      // Authorization Guard
      if (req.user && req.user.role === 'mechanic') {
        let isAssigned = appointment.mechanic_id === req.user.id || report.mechanic_id === req.user.id;
        if (!isAssigned) {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: appointment.id, mechanic_id: req.user.id },
            transaction
          });
          if (amRecord) isAssigned = true;
        }

        if (!isAssigned) {
          await transaction.rollback();
          return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا التقرير الفني' });
        }
      }

      const {
        diagnostics,
        diagnosis,
        mechanic_notes,
        odometer,
        obd2_codes,
        visual_notes,
        repair_plan,
        urgency_level,
        estimated_labor_cost,
        labor_cost
      } = req.body;

      const targetDiag = diagnostics !== undefined ? diagnostics : diagnosis;
      const targetLabor = estimated_labor_cost !== undefined ? estimated_labor_cost : labor_cost;

      // Validation checks
      if (targetDiag !== undefined) {
        if (typeof targetDiag !== 'string' || !targetDiag.trim()) {
          await transaction.rollback();
          return res.status(400).json({ message: 'التشخيص الفني لا يمكن أن يكون فارغاً' });
        }
        report.diagnostics = targetDiag.trim();
      }

      if (odometer !== undefined && odometer !== null && odometer !== '') {
        const numOdo = Number(odometer);
        if (isNaN(numOdo) || !Number.isInteger(numOdo) || numOdo < 0) {
          await transaction.rollback();
          return res.status(400).json({ message: 'قراءة العداد يجب أن تكون رقماً موجباً' });
        }
        report.odometer = numOdo;
      }

      if (urgency_level) {
        if (!VALID_URGENCY_LEVELS.includes(urgency_level.toString().toLowerCase())) {
          await transaction.rollback();
          return res.status(400).json({ message: 'مستوى الأهمية غير صالح' });
        }
        report.urgency_level = urgency_level.toString().toLowerCase();
      }

      if (targetLabor !== undefined && targetLabor !== null && targetLabor !== '') {
        const numLabor = Number(targetLabor);
        if (isNaN(numLabor) || numLabor < 0) {
          await transaction.rollback();
          return res.status(400).json({ message: 'التكلفة التقديرية لأجور العمل يجب أن تكون رقماً موجباً' });
        }
        report.estimated_labor_cost = numLabor;
      }

      if (mechanic_notes !== undefined) report.mechanic_notes = mechanic_notes ? mechanic_notes.trim() : null;
      if (obd2_codes !== undefined) report.obd2_codes = obd2_codes ? obd2_codes.trim() : null;
      if (visual_notes !== undefined) report.visual_notes = visual_notes ? visual_notes.trim() : null;
      if (repair_plan !== undefined) report.repair_plan = repair_plan ? repair_plan.trim() : null;

      await report.save({ transaction });
      await transaction.commit();

      await logAudit({
        req,
        action: 'TECHNICAL_REPORT_UPDATED',
        entityType: 'TechnicalReport',
        entityId: report.id,
        newValues: {
          diagnostics: report.diagnostics,
          repair_plan: report.repair_plan,
          estimated_labor_cost: report.estimated_labor_cost
        }
      });

      const updatedReport = await TechnicalReport.findByPk(report.id, {
        include: [
          { model: RequiredPart, as: 'requestedParts', include: [{ model: SparePart, as: 'partDetails' }] },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'phone'] }
        ]
      });

      res.json({ message: 'تم تحديث التقرير الفني بنجاح', report: updatedReport });
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating technical report:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/technical-reports/:id
  getReportById: async (req, res) => {
    try {
      const report = await TechnicalReport.findByPk(req.params.id, {
        include: [
          {
            model: Appointment,
            as: 'appointment',
            include: [
              { model: Vehicle, as: 'vehicle', attributes: ['id', 'make', 'model', 'license_plate', 'year'] },
              { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] }
            ]
          },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'phone', 'email'] },
          {
            model: RequiredPart,
            as: 'requestedParts',
            include: [{ model: SparePart, as: 'partDetails' }]
          }
        ]
      });

      if (!report) {
        return res.status(404).json({ message: 'التقرير الفني غير موجود' });
      }

      // Authorization Checks
      if (req.user && req.user.role === 'client') {
        if (report.appointment?.client_id !== req.user.id) {
          return res.status(404).json({ message: 'التقرير الفني غير موجود' });
        }
      }

      if (req.user && req.user.role === 'mechanic') {
        let isAssigned = report.appointment?.mechanic_id === req.user.id || report.mechanic_id === req.user.id;
        if (!isAssigned && report.appointment_id) {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: report.appointment_id, mechanic_id: req.user.id }
          });
          if (amRecord) isAssigned = true;
        }
        if (!isAssigned) {
          return res.status(404).json({ message: 'التقرير الفني غير موجود' });
        }
      }

      res.json(report);
    } catch (error) {
      console.error('Error fetching technical report:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/technical-reports/appointment/:appointmentId
  getReportByAppointment: async (req, res) => {
    try {
      const appointmentId = req.params.appointmentId || req.params.id;
      const report = await TechnicalReport.findOne({
        where: { appointment_id: appointmentId },
        include: [
          {
            model: Appointment,
            as: 'appointment',
            include: [
              { model: Vehicle, as: 'vehicle', attributes: ['id', 'make', 'model', 'license_plate', 'year'] },
              { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] }
            ]
          },
          { model: User, as: 'mechanic', attributes: ['id', 'name', 'phone', 'email'] },
          {
            model: RequiredPart,
            as: 'requestedParts',
            include: [{ model: SparePart, as: 'partDetails' }]
          }
        ]
      });

      if (!report) {
        return res.status(404).json({ message: 'لا يوجد تقرير فني لهذا الموعد' });
      }

      // Authorization Checks
      if (req.user && req.user.role === 'client') {
        if (report.appointment?.client_id !== req.user.id) {
          return res.status(404).json({ message: 'لا يوجد تقرير فني لهذا الموعد' });
        }
      }

      if (req.user && req.user.role === 'mechanic') {
        let isAssigned = report.appointment?.mechanic_id === req.user.id || report.mechanic_id === req.user.id;
        if (!isAssigned) {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: appointmentId, mechanic_id: req.user.id }
          });
          if (amRecord) isAssigned = true;
        }
        if (!isAssigned) {
          return res.status(404).json({ message: 'لا يوجد تقرير فني لهذا الموعد' });
        }
      }

      res.json(report);
    } catch (error) {
      console.error('Error fetching technical report by appointment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
