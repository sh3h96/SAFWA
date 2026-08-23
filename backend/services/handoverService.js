'use strict';

const { Appointment, Invoice, Payment, sequelize } = require('../models');
const { logAudit } = require('../utils/auditLogger');

class HandoverService {

  /**
   * Finalizes vehicle handover and marks appointment as completed inside an atomic transaction.
   * Enforces Rule 7-001 through Rule 7-012.
   */
  static async performHandover({ appointment_id, handover_notes = null, req }) {
    // 1. Delivery Authorization Guard (Section 9, Rule 7-001.7)
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      const err = new Error('ليس لديك صلاحية لتسليم السيارة.');
      err.statusCode = 403;
      throw err;
    }

    if (!appointment_id) {
      const err = new Error('معرف الموعد (appointment_id) مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      // 2. Lock Appointment (Section 14 & 15: Row-level locking to prevent concurrent handovers)
      const appointment = await Appointment.findByPk(appointment_id, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!appointment) {
        await t.rollback();
        const err = new Error('الموعد غير موجود');
        err.statusCode = 404;
        throw err;
      }

      // 3. Idempotency & Duplicate Handover Guard (Section 16, Rule 7-001.8, Rule 7-004)
      if (appointment.status === 'completed') {
        await t.rollback();
        const err = new Error('تم تسليم السيارة مسبقاً.');
        err.statusCode = 409;
        throw err;
      }

      if (appointment.status === 'cancelled') {
        await t.rollback();
        const err = new Error('لا يمكن تسليم موعد ملغى.');
        err.statusCode = 409;
        throw err;
      }

      // 4. Status Transition Guard (Section 3, Section 4, Rule 7-001.1)
      if (appointment.status !== 'ready_for_pickup') {
        await t.rollback();
        const err = new Error('لا يمكن تسليم السيارة لأن الموعد ليس في حالة جاهز للاستلام.');
        err.statusCode = 400;
        throw err;
      }

      // 5. Invoice Existence Guard (Section 7, Rule 7-001.2, Rule 7-001.3)
      const invoice = await Invoice.findOne({
        where: { appointment_id: appointment.id },
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!invoice) {
        await t.rollback();
        const err = new Error('لا يمكن تسليم السيارة قبل إصدار الفاتورة.');
        err.statusCode = 400;
        throw err;
      }

      // 6. Payment Verification Guard using Phase 6 Payment records (Section 5, Section 6, Rule 7-001.4, 7-001.5, 7-001.6)
      const payments = await Payment.findAll({
        where: { invoice_id: invoice.id },
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      const totalPaid = parseFloat(payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2));
      const totalAmount = parseFloat(invoice.total_amount);
      const remainingBalance = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));

      if (invoice.status !== 'paid' || totalPaid < totalAmount - 0.001 || remainingBalance > 0.001) {
        await t.rollback();
        const err = new Error('لا يمكن تسليم السيارة قبل سداد الفاتورة بالكامل.');
        err.statusCode = 409;
        err.totalAmount = totalAmount;
        err.totalPaid = totalPaid;
        err.remainingBalance = remainingBalance;
        throw err;
      }

      // 7. Perform Atomic Handover Update (Section 11, Section 14)
      const deliveryTime = new Date();
      await appointment.update({
        status: 'completed',
        delivered_at: deliveryTime
      }, { transaction: t });

      await t.commit();

      // 8. Audit Trail Logging (Section 22)
      await logAudit({
        req,
        action: 'VEHICLE_HANDOVER',
        entityType: 'Appointment',
        entityId: appointment.id,
        oldValues: { status: 'ready_for_pickup', delivered_at: null },
        newValues: { status: 'completed', delivered_at: deliveryTime, handover_notes: handover_notes || null }
      });

      const updatedAppointment = await Appointment.findByPk(appointment.id, {
        include: [{ model: Invoice, as: 'invoice' }]
      });

      return {
        message: 'تم تسليم السيارة وإغلاق الموعد بنجاح.',
        appointment: updatedAppointment,
        delivered_at: deliveryTime,
        financials: {
          totalAmount,
          totalPaid,
          remainingBalance: 0
        }
      };
    } catch (error) {
      if (t && !t.finished) {
        try { await t.rollback(); } catch (e) {}
      }
      throw error;
    }
  }
}

module.exports = HandoverService;
