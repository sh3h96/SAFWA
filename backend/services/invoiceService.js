'use strict';

const { Invoice, InvoiceItem, Payment, TechnicalReport, RequiredPart, SparePart, Appointment, Vehicle, User, sequelize } = require('../models');
const { logAudit } = require('../utils/auditLogger');

class InvoiceService {

  /**
   * Generates an official invoice atomically inside a transaction.
   */
  static async createInvoice({ appointment_id, final_labor_price, discount = 0, req }) {
    // Authorization Check: Admin or Super Admin ONLY
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      const err = new Error('غير مصرح لك بإصدار الفواتير. هذه العملية مقتصرة على الإدارة فقط.');
      err.statusCode = 403;
      throw err;
    }

    if (!appointment_id) {
      const err = new Error('معرف الموعد (appointment_id) مطلوب');
      err.statusCode = 400;
      throw err;
    }

    // Validate final_labor_price (Rule FIN-002, Section 9)
    const parsedLabor = parseFloat(final_labor_price);
    if (final_labor_price === undefined || final_labor_price === null || isNaN(parsedLabor) || !isFinite(parsedLabor) || parsedLabor < 0) {
      const err = new Error('سعر أجور العمالة النهائي غير صالح. يجب أن يكون رقماً صحيحاً أو عشرياً غير سالب (>= 0)');
      err.statusCode = 400;
      throw err;
    }

    // Validate discount (Section 10)
    const parsedDiscount = parseFloat(discount || 0);
    if (isNaN(parsedDiscount) || !isFinite(parsedDiscount) || parsedDiscount < 0) {
      const err = new Error('مبلغ الخصم غير صالح. يجب أن يكون رقماً غير سالب (>= 0)');
      err.statusCode = 400;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      // 1. Lock Appointment
      const appt = await Appointment.findByPk(appointment_id, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!appt) {
        await t.rollback();
        const err = new Error('الموعد غير موجود');
        err.statusCode = 404;
        throw err;
      }

      // Check state: cannot issue invoice for cancelled appointment
      if (appt.status === 'cancelled') {
        await t.rollback();
        const err = new Error('لا يمكن إصدار فاتورة لموعد ملغى');
        err.statusCode = 409;
        throw err;
      }

      // 2. Uniqueness Check (Rule FIN-005, Section 23): One appointment = max 1 official invoice
      const existingInvoice = await Invoice.findOne({
        where: { appointment_id },
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (existingInvoice) {
        await t.rollback();
        const err = new Error(`تم إصدار فاتورة رسمية لهذا الموعد مسبقاً (رقم الفاتورة: #${existingInvoice.id})`);
        err.statusCode = 409;
        err.invoice = existingInvoice;
        throw err;
      }

      // 3. Technical Report Check (Rule FIN-006)
      const report = await TechnicalReport.findOne({
        where: { appointment_id },
        include: [{
          model: RequiredPart,
          as: 'requestedParts',
          include: [{ model: SparePart, as: 'partDetails' }]
        }],
        transaction: t
      });

      if (!report) {
        await t.rollback();
        const err = new Error('لا يمكن إصدار الفاتورة قبل وجود تقرير فني مكتمل للموعد');
        err.statusCode = 400;
        throw err;
      }

      // 4. Pending Parts Guard (Rule FIN-007): Pending parts block invoice creation!
      const requestedParts = report.requestedParts || [];
      const hasPendingParts = requestedParts.some(p => p.status === 'pending');
      if (hasPendingParts) {
        await t.rollback();
        const err = new Error('لا يمكن إصدار فاتورة وبها قطع غيار قيد الانتظار (pending). يجب اعتماد أو رفض جميع القطع المطلوبة أولاً.');
        err.statusCode = 409;
        throw err;
      }

      // 5. Calculate Parts Cost & Prepare Snapshots (Rule FIN-008, Section 7, Section 8, Section 28)
      // Exclude 'rejected' parts. Only include 'approved' or 'installed'.
      const activeParts = requestedParts.filter(p => p.status === 'approved' || p.status === 'installed');
      let partsSubtotal = 0;
      const partItemsToCreate = [];

      for (const reqPart of activeParts) {
        const sparePart = await SparePart.findByPk(reqPart.part_id, {
          lock: t.LOCK.UPDATE,
          transaction: t
        });

        if (sparePart) {
          const unitPrice = parseFloat(sparePart.price || 0);
          const qty = Number(reqPart.quantity);
          const lineTotal = parseFloat((unitPrice * qty).toFixed(2));
          partsSubtotal += lineTotal;

          partItemsToCreate.push({
            part_id: sparePart.id,
            description: sparePart.name || 'قطعة غيار',
            quantity: qty,
            unit_price: unitPrice,
            total_price: lineTotal
          });
        }
      }

      partsSubtotal = parseFloat(partsSubtotal.toFixed(2));
      const subtotal = parseFloat((parsedLabor + partsSubtotal).toFixed(2));

      if (parsedDiscount > subtotal) {
        await t.rollback();
        const err = new Error(`مبلغ الخصم (${parsedDiscount}) لا يمكن أن يتجاوز إجمالي الفاتورة (${subtotal})`);
        err.statusCode = 400;
        throw err;
      }

      const totalAmount = parseFloat((subtotal - parsedDiscount).toFixed(2));

      if (totalAmount < 0) {
        await t.rollback();
        const err = new Error('إجمالي الفاتورة النهائي لا يمكن أن يكون رقماً سلباً');
        err.statusCode = 400;
        throw err;
      }

      // 6. Create Invoice Record
      const invoice = await Invoice.create({
        appointment_id,
        total_amount: totalAmount,
        status: 'unpaid',
        issued_at: new Date()
      }, { transaction: t });

      // 7. Create Labor Snapshot Item
      await InvoiceItem.create({
        invoice_id: invoice.id,
        part_id: null,
        description: 'أجور اليد والخدمة',
        quantity: 1,
        unit_price: parsedLabor,
        total_price: parsedLabor
      }, { transaction: t });

      // 8. Create Part Snapshot Items
      for (const item of partItemsToCreate) {
        await InvoiceItem.create({
          invoice_id: invoice.id,
          part_id: item.part_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }, { transaction: t });
      }

      await t.commit();

      // Audit Log
      await logAudit({
        req,
        action: 'INVOICE_CREATED',
        entityType: 'Invoice',
        entityId: invoice.id,
        newValues: { appointment_id, total_amount: totalAmount, final_labor_price: parsedLabor, parts_cost: partsSubtotal, discount: parsedDiscount }
      });

      // Reload with items for response
      const createdInvoice = await Invoice.findByPk(invoice.id, {
        include: [{ model: InvoiceItem, as: 'items' }]
      });

      return createdInvoice;
    } catch (error) {
      if (t && !t.finished) {
        try { await t.rollback(); } catch (e) {}
      }
      throw error;
    }
  }

  /**
   * Fetches invoice details with snapshot items, calculated payments, and status.
   */
  static async getInvoiceById({ invoice_id, reqUser }) {
    const invoice = await Invoice.findByPk(invoice_id, {
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
            { model: Vehicle, as: 'vehicle', attributes: ['id', 'make', 'model', 'license_plate'] }
          ]
        },
        {
          model: InvoiceItem,
          as: 'items',
          include: [{ model: SparePart, as: 'part' }]
        },
        {
          model: Payment,
          as: 'payments'
        }
      ]
    });

    if (!invoice) {
      const err = new Error('الفاتورة غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    // Ownership Verification for Client
    if (reqUser && reqUser.role === 'client') {
      if (!invoice.appointment || Number(invoice.appointment.client_id) !== Number(reqUser.id)) {
        const err = new Error('الفاتورة غير موجودة');
        err.statusCode = 404;
        throw err;
      }
    }

    // Calculate sum of payments strictly from Payment records (Rule FIN-011)
    const payments = invoice.payments || [];
    const totalPaid = parseFloat(payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2));
    const totalAmount = parseFloat(invoice.total_amount);
    const remainingBalance = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));

    // Recalculate status from payments (Rule FIN-012)
    let derivedStatus = 'unpaid';
    if (totalPaid >= totalAmount - 0.001) {
      derivedStatus = 'paid';
    } else if (totalPaid > 0) {
      derivedStatus = 'partially_paid';
    }

    return {
      invoice,
      totalAmount,
      totalPaid,
      remainingBalance,
      derivedStatus
    };
  }
}

module.exports = InvoiceService;
