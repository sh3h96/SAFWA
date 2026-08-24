'use strict';

const { Invoice, Payment, sequelize } = require('../models');
const { logAudit } = require('../utils/auditLogger');

class PaymentService {

  /**
   * Records a payment against an invoice inside a locked database transaction.
   */
  static async recordPayment({ invoice_id, amount, payment_method = 'cash', transaction_id = null, req }) {
    // Authorization Check: Admin or Super Admin ONLY
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      const err = new Error('غير مصرح لك بتسجيل المدفوعات. هذه العملية مقتصرة على الإدارة فقط.');
      err.statusCode = 403;
      throw err;
    }

    if (!invoice_id) {
      const err = new Error('معرف الفاتورة (invoice_id) مطلوب');
      err.statusCode = 400;
      throw err;
    }

    // Validate amount (Rule FIN-009, Section 15, Section 16)
    const parsedAmount = parseFloat(amount);
    if (amount === undefined || amount === null || isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
      const err = new Error('مبلغ الدفعة غير صالح. يجب أن يكون رقماً موجباً أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      // 1. Lock Invoice (Rule FIN-018: Row-level locking to prevent concurrency race conditions)
      const invoice = await Invoice.findByPk(invoice_id, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!invoice) {
        await t.rollback();
        const err = new Error('الفاتورة غير موجودة');
        err.statusCode = 404;
        throw err;
      }

      // 2. Lock & Load existing payments inside transaction
      const existingPayments = await Payment.findAll({
        where: { invoice_id: invoice.id },
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      const existingTotalPaid = parseFloat(existingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2));
      const totalAmount = parseFloat(invoice.total_amount);
      const remainingBalance = parseFloat((totalAmount - existingTotalPaid).toFixed(2));

      if (remainingBalance <= 0.001) {
        await t.rollback();
        const err = new Error('الفاتورة مسددة بالكامل بالفعل ولا تسع أية مدفوعات إضافية');
        err.statusCode = 409;
        throw err;
      }

      // 3. Overpayment Guard (Rule FIN-009, Section 14)
      if (parsedAmount > remainingBalance + 0.001) {
        await t.rollback();
        const err = new Error(`مبلغ الدفعة (${parsedAmount}) يتجاوز المبلغ المتبقي للفاتورة (${remainingBalance})`);
        err.statusCode = 409;
        err.remainingBalance = remainingBalance;
        throw err;
      }

      // 4. Create Payment Record
      const newPayment = await Payment.create({
        invoice_id: invoice.id,
        amount: parsedAmount,
        payment_method: payment_method || 'cash',
        transaction_id: transaction_id || null,
        paid_at: new Date()
      }, { transaction: t });

      // 5. Recalculate Invoice Status (Rule FIN-011, FIN-012)
      const newTotalPaid = parseFloat((existingTotalPaid + parsedAmount).toFixed(2));
      let newStatus = 'unpaid';
      if (newTotalPaid >= totalAmount - 0.001) {
        newStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newStatus = 'partially_paid';
      }

      const oldStatus = invoice.status;
      await invoice.update({ status: newStatus }, { transaction: t });

      await t.commit();

      // Audit Logging
      await logAudit({
        req,
        action: 'PAYMENT_RECORDED',
        entityType: 'Invoice',
        entityId: invoice.id,
        newValues: { payment_id: newPayment.id, amount: parsedAmount, payment_method, newStatus }
      });

      if (newStatus !== oldStatus) {
        await logAudit({
          req,
          action: 'INVOICE_STATUS_CHANGED',
          entityType: 'Invoice',
          entityId: invoice.id,
          oldValues: { status: oldStatus },
          newValues: { status: newStatus }
        });
      }

      const newRemaining = parseFloat(Math.max(0, totalAmount - newTotalPaid).toFixed(2));

      return {
        payment: newPayment,
        invoiceStatus: newStatus,
        totalAmount,
        totalPaid: newTotalPaid,
        remainingBalance: newRemaining
      };
    } catch (error) {
      if (t && !t.finished) {
        try { await t.rollback(); } catch (e) {}
      }
      throw error;
    }
  }

  /**
   * Retrieves payment history for an invoice.
   */
  static async getPaymentHistory({ invoice_id }) {
    const payments = await Payment.findAll({
      where: { invoice_id },
      order: [['paid_at', 'ASC']]
    });
    return payments;
  }
}

module.exports = PaymentService;
