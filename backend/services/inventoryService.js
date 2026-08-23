'use strict';

const { RequiredPart, SparePart, TechnicalReport, Appointment, User, AppointmentMechanic, sequelize } = require('../models');
const { logAudit } = require('../utils/auditLogger');

/**
 * Service providing transactional and concurrency-protected inventory operations.
 */
class InventoryService {

  /**
   * Approves a single RequiredPart record inside a transaction with row locking.
   * Deducts stock EXACTLY ONCE.
   */
  static async approveSingleRequiredPart({ requiredPartId, price = null, req, externalTransaction = null }) {
    const transaction = externalTransaction || await sequelize.transaction();
    try {
      // 1. Lock RequiredPart
      const reqPart = await RequiredPart.findByPk(requiredPartId, {
        include: [{ model: SparePart, as: 'partDetails' }],
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!reqPart) {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error(`طلب قطعة الغيار #${requiredPartId} غير موجود`);
        err.statusCode = 404;
        throw err;
      }

      // 2. Validate current status
      if (reqPart.status === 'approved') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error('تم اعتماد هذا الطلب سابقاً');
        err.statusCode = 409;
        throw err;
      }

      if (reqPart.status === 'installed') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error('القطعة مسبقة التركيب بالفعل');
        err.statusCode = 409;
        throw err;
      }

      if (reqPart.status === 'rejected') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error('لا يمكن اعتماد قطعة تم رفضها سابقاً');
        err.statusCode = 409;
        throw err;
      }

      if (reqPart.status !== 'pending') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error(`القطعة في حالة (${reqPart.status}) ولا يمكن اعتمادها`);
        err.statusCode = 409;
        throw err;
      }

      // 3. Lock associated SparePart
      const sparePart = await SparePart.findByPk(reqPart.part_id, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!sparePart) {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error(`قطعة الغيار في الكتالوج #${reqPart.part_id} غير موجودة`);
        err.statusCode = 404;
        throw err;
      }

      // 4. Validate Quantity
      const requestedQty = Number(reqPart.quantity);
      if (isNaN(requestedQty) || requestedQty <= 0 || !Number.isInteger(requestedQty)) {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error('كمية القطعة المطلوبة غير صالحة');
        err.statusCode = 400;
        throw err;
      }

      // 5. Validate Stock Sufficiency (INV-004 & INV-005)
      const currentStock = sparePart.stock_quantity !== null && sparePart.stock_quantity !== undefined ? Number(sparePart.stock_quantity) : 0;
      if (currentStock < requestedQty) {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error(`المخزون غير كافٍ للقطعة "${sparePart.name}". المتوفر: ${currentStock}، المطلوب: ${requestedQty}`);
        err.statusCode = 409;
        err.available = currentStock;
        err.requested = requestedQty;
        throw err;
      }

      // 6. Deduct Stock EXACTLY ONCE
      const newStock = currentStock - requestedQty;
      sparePart.stock_quantity = newStock;
      await sparePart.save({ transaction });

      // 7. Update RequiredPart status to 'approved'
      reqPart.status = 'approved';
      await reqPart.save({ transaction });

      // Log Audit
      await logAudit({
        req,
        action: 'PART_STOCK_APPROVED_DEDUCTION',
        entityType: 'RequiredPart',
        entityId: reqPart.id,
        oldValues: { status: 'pending', stock_quantity: currentStock },
        newValues: { status: 'approved', stock_quantity: newStock, quantity_deducted: requestedQty }
      });

      if (!externalTransaction) {
        await transaction.commit();
      }

      return {
        requiredPart: reqPart,
        sparePart,
        previousStock: currentStock,
        newStock
      };
    } catch (error) {
      if (!externalTransaction && transaction) {
        try { await transaction.rollback(); } catch (e) {}
      }
      throw error;
    }
  }

  /**
   * Installs an approved RequiredPart.
   * Rule INV-002: NO STOCK DEDUCTION OCCURS AT INSTALLATION!
   */
  static async installSingleRequiredPart({ requiredPartId, req, externalTransaction = null }) {
    const transaction = externalTransaction || await sequelize.transaction();
    try {
      // 1. Lock RequiredPart with detailed include for ownership verification
      const reqPart = await RequiredPart.findByPk(requiredPartId, {
        include: [
          { model: SparePart, as: 'partDetails' },
          {
            model: TechnicalReport,
            as: 'technicalReport',
            include: [{ model: Appointment, as: 'appointment' }]
          }
        ],
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!reqPart) {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error(`طلب قطعة الغيار #${requiredPartId} غير موجود`);
        err.statusCode = 404;
        throw err;
      }

      // 2. Authorization Check (Rule INV-008 & INV-010)
      if (req.user && req.user.role === 'client') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error('غير مصرح لك بتغيير حالة القطعة إلى مركب');
        err.statusCode = 403;
        throw err;
      }

      if (req.user && req.user.role === 'mechanic') {
        const appt = reqPart.technicalReport?.appointment;
        const report = reqPart.technicalReport;
        let isAssigned = false;
        if (appt && (appt.mechanic_id === req.user.id || report?.mechanic_id === req.user.id)) {
          isAssigned = true;
        } else if (appt) {
          const amRecord = await AppointmentMechanic.findOne({
            where: { appointment_id: appt.id, mechanic_id: req.user.id },
            transaction
          });
          if (amRecord) isAssigned = true;
        }

        if (!isAssigned) {
          if (!externalTransaction) await transaction.rollback();
          const err = new Error('غير مصرح لك بتركيب قطعة لتقرير فني مسند لفني آخر');
          err.statusCode = 403;
          throw err;
        }
      }

      // 3. State Machine Check (Rule INV-003)
      if (reqPart.status === 'installed') {
        if (!externalTransaction) await transaction.rollback();
        // Idempotent success or notification
        return { requiredPart: reqPart, message: 'القطعة مركبة بالفعل' };
      }

      if (reqPart.status === 'pending') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error('لا يمكن تركيب قطعة غير معتمدة. يجب اعتماد القطعة وتخصيص المخزون أولاً.');
        err.statusCode = 409;
        throw err;
      }

      if (reqPart.status === 'rejected') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error('لا يمكن تركيب قطعة تم رفضها.');
        err.statusCode = 409;
        throw err;
      }

      if (reqPart.status !== 'approved') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error(`القطعة في حالة (${reqPart.status}) ولا يمكن تركيبها`);
        err.statusCode = 409;
        throw err;
      }

      // 4. Perform Transition to 'installed'
      // STRICT RULE INV-002: DO NOT DEDUCT STOCK AGAIN!
      reqPart.status = 'installed';
      await reqPart.save({ transaction });

      await logAudit({
        req,
        action: 'REQUIRED_PART_INSTALLED',
        entityType: 'RequiredPart',
        entityId: reqPart.id,
        oldValues: { status: 'approved' },
        newValues: { status: 'installed' }
      });

      if (!externalTransaction) {
        await transaction.commit();
      }

      return {
        requiredPart: reqPart,
        message: 'تم تركيب قطعة الغيار بنجاح (المخزون لم يتغير لأن الخصم تم عند الاعتماد)'
      };
    } catch (error) {
      if (!externalTransaction && transaction) {
        try { await transaction.rollback(); } catch (e) {}
      }
      throw error;
    }
  }

  /**
   * Rejects a pending RequiredPart.
   */
  static async rejectSingleRequiredPart({ requiredPartId, req, externalTransaction = null }) {
    const transaction = externalTransaction || await sequelize.transaction();
    try {
      const reqPart = await RequiredPart.findByPk(requiredPartId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!reqPart) {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error(`طلب قطعة الغيار #${requiredPartId} غير موجود`);
        err.statusCode = 404;
        throw err;
      }

      if (reqPart.status === 'approved' || reqPart.status === 'installed') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error(`لا يمكن رفض قطعة بالحالة (${reqPart.status})`);
        err.statusCode = 409;
        throw err;
      }

      if (reqPart.status === 'rejected') {
        if (!externalTransaction) await transaction.rollback();
        const err = new Error('القطعة مرفوضة بالفعل');
        err.statusCode = 409;
        throw err;
      }

      reqPart.status = 'rejected';
      await reqPart.save({ transaction });

      await logAudit({
        req,
        action: 'PARTS_REQUEST_REJECTED',
        entityType: 'RequiredPart',
        entityId: reqPart.id,
        oldValues: { status: 'pending' },
        newValues: { status: 'rejected' }
      });

      if (!externalTransaction) {
        await transaction.commit();
      }

      return { requiredPart: reqPart };
    } catch (error) {
      if (!externalTransaction && transaction) {
        try { await transaction.rollback(); } catch (e) {}
      }
      throw error;
    }
  }

  /**
   * Manual Stock Replenishment / Adjustment (Admin Only).
   */
  static async adjustManualStock({ sparePartId, newStockQuantity, req }) {
    const transaction = await sequelize.transaction();
    try {
      // Role Check
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        await transaction.rollback();
        const err = new Error('غير مصرح لك بتعديل المخزون يدويًا');
        err.statusCode = 403;
        throw err;
      }

      const numQty = Number(newStockQuantity);
      if (newStockQuantity === undefined || isNaN(numQty) || !Number.isInteger(numQty) || numQty < 0) {
        await transaction.rollback();
        const err = new Error('كمية المخزون يجب أن تكون رقماً صحيحاً غير سالب (>= 0)');
        err.statusCode = 400;
        throw err;
      }

      const sparePart = await SparePart.findByPk(sparePartId, {
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!sparePart) {
        await transaction.rollback();
        const err = new Error('قطعة الغيار غير موجودة');
        err.statusCode = 404;
        throw err;
      }

      const oldQty = sparePart.stock_quantity;
      sparePart.stock_quantity = numQty;
      await sparePart.save({ transaction });

      await logAudit({
        req,
        action: 'STOCK_MANUAL_ADJUSTMENT',
        entityType: 'SparePart',
        entityId: sparePart.id,
        oldValues: { stock_quantity: oldQty },
        newValues: { stock_quantity: numQty }
      });

      await transaction.commit();

      return {
        sparePart,
        oldStock: oldQty,
        newStock: numQty
      };
    } catch (error) {
      if (transaction) {
        try { await transaction.rollback(); } catch (e) {}
      }
      throw error;
    }
  }
}

module.exports = InventoryService;
