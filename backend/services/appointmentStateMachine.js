'use strict';

const { TechnicalReport, RequiredPart, Invoice, Payment, AppointmentMechanic } = require('../models');

const VALID_STATUSES = [
  'pending',
  'awaiting_assignment',
  'under_inspection',
  'in_progress',
  'waiting_parts',
  'ready_for_pickup',
  'completed',
  'cancelled'
];

const ALLOWED_TRANSITIONS = {
  pending: ['awaiting_assignment', 'under_inspection', 'cancelled'],
  awaiting_assignment: ['under_inspection', 'cancelled'],
  under_inspection: ['in_progress', 'waiting_parts', 'cancelled'],
  in_progress: ['waiting_parts', 'ready_for_pickup', 'cancelled'],
  waiting_parts: ['in_progress', 'cancelled'],
  ready_for_pickup: ['completed', 'in_progress', 'cancelled'],
  completed: [],
  cancelled: []
};

const VALID_CANCELLATION_REASONS = [
  'client_requested',
  'duplicate_appointment',
  'required_part_unavailable',
  'repair_not_feasible',
  'administrative_reason'
];

/**
 * Validates state transition and enforces state machine transition guards.
 * Throws an Error object with custom statusCode and message if invalid.
 */
async function validateAndAssertTransition({ appointment, newStatus, reqBody = {}, transaction = null }) {
  const oldStatus = appointment.status;

  if (!newStatus) {
    return; // No status change requested
  }

  if (!VALID_STATUSES.includes(newStatus)) {
    const error = new Error(`حالة غير صالحة: ${newStatus}. الحالات الصالحة هي: ${VALID_STATUSES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  if (oldStatus === newStatus) {
    return; // Same status, no-op
  }

  // Terminal states check: completed and cancelled are terminal
  if (oldStatus === 'completed' || oldStatus === 'cancelled') {
    const error = new Error(`لا يمكن تغيير حالة موعد بحالة نهائية (${oldStatus === 'completed' ? 'مكتمل' : 'ملغى'}).`);
    error.statusCode = 400;
    throw error;
  }

  // Allowed transitions check
  const allowedNext = ALLOWED_TRANSITIONS[oldStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    const error = new Error(`انتقال غير مسموح به من حالة '${oldStatus}' إلى حالة '${newStatus}'`);
    error.statusCode = 400;
    throw error;
  }

  // GUARD 1: Mechanic Assignment Guard (under_inspection)
  if (newStatus === 'under_inspection') {
    let mechanicAssigned = !!appointment.mechanic_id || !!reqBody.mechanic_id || (Array.isArray(reqBody.mechanic_ids) && reqBody.mechanic_ids.length > 0);
    
    if (!mechanicAssigned) {
      // Check AppointmentMechanic table
      const count = await AppointmentMechanic.count({
        where: { appointment_id: appointment.id },
        transaction
      });
      if (count > 0) mechanicAssigned = true;
    }

    if (!mechanicAssigned) {
      const error = new Error('لا يمكن بدء الفحص قبل تعيين فني.');
      error.statusCode = 400;
      throw error;
    }
  }

  // GUARD 2: Technical Report Guard (in_progress)
  if (newStatus === 'in_progress') {
    const report = await TechnicalReport.findOne({
      where: { appointment_id: appointment.id },
      transaction
    });

    if (!report) {
      const error = new Error('لا يمكن بدء الإصلاح قبل إكمال التقرير الفني.');
      error.statusCode = 400;
      throw error;
    }

    // Phase 3 Strengthening: Report MUST contain valid diagnosis, repair plan, and labor estimate
    const hasValidDiag = report.diagnostics && typeof report.diagnostics === 'string' && report.diagnostics.trim().length > 0;
    const hasValidPlan = report.repair_plan && typeof report.repair_plan === 'string' && report.repair_plan.trim().length > 0;
    const hasValidLabor = report.estimated_labor_cost !== null && report.estimated_labor_cost !== undefined && !isNaN(Number(report.estimated_labor_cost)) && Number(report.estimated_labor_cost) >= 0;

    if (!hasValidDiag || !hasValidPlan || !hasValidLabor) {
      const error = new Error('لا يمكن بدء الإصلاح قبل إكمال التقرير الفني وتحديد التشخيص وخطة العمل وتكلفة أجور العمل التقديرية.');
      error.statusCode = 400;
      throw error;
    }

    // Cannot start repair from under_inspection/waiting_parts if any requested part is still 'pending' or 'approved' (uninstalled)
    if (oldStatus === 'under_inspection' || oldStatus === 'waiting_parts') {
      const uninstalledPartsCount = await RequiredPart.count({
        where: { technical_report_id: report.id, status: ['pending', 'approved'] },
        transaction
      });

      if (uninstalledPartsCount > 0) {
        const error = new Error('لا يمكن بدء/متابعة الإصلاح مع وجود قطع غيار بانتظار الاعتماد أو التركيب. يجب تركئب القطع المعتمدة وحسم جميع الطلبات المعلقة أولاً.');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // GUARD 3: Ready for Pickup Guard (ready_for_pickup)
  if (newStatus === 'ready_for_pickup') {
    const report = await TechnicalReport.findOne({
      where: { appointment_id: appointment.id },
      include: [{ model: RequiredPart, as: 'requestedParts' }],
      transaction
    });

    if (!report) {
      const error = new Error('لا يمكن تجهيز السيارة للاستلام دون وجود تقرير فني مكتمل.');
      error.statusCode = 400;
      throw error;
    }

    if (report.requestedParts && report.requestedParts.length > 0) {
      const pendingOrApprovedParts = report.requestedParts.filter(p => p.status === 'pending' || p.status === 'approved');
      if (pendingOrApprovedParts.length > 0) {
        const error = new Error('لا يمكن إنهاء الصيانة مع وجود قطع غيار غير مكتملة.');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // GUARD 4: Completion Guard (completed)
  if (newStatus === 'completed') {
    if (oldStatus !== 'ready_for_pickup') {
      const error = new Error('لا يمكن إكمال الموعد وتسليم السيارة مباشرة. يجب أن تمر بالحالة (ready_for_pickup) أولاً.');
      error.statusCode = 400;
      throw error;
    }

    // Invoice Existence Guard (Rule 7-001.2)
    const invoice = await Invoice.findOne({
      where: { appointment_id: appointment.id },
      transaction
    });

    if (!invoice) {
      const error = new Error('لا يمكن تسليم السيارة قبل إصدار الفاتورة.');
      error.statusCode = 400;
      throw error;
    }

    // Payment Verification Guard (Rule 7-001.4, 7-001.5)
    const payments = await Payment.findAll({
      where: { invoice_id: invoice.id },
      transaction
    });

    const totalPaid = parseFloat(payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2));
    const totalAmount = parseFloat(invoice.total_amount);
    const remainingBalance = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));

    if (invoice.status !== 'paid' || totalPaid < totalAmount - 0.001 || remainingBalance > 0.001) {
      const error = new Error('لا يمكن تسليم السيارة قبل سداد الفاتورة بالكامل.');
      error.statusCode = 409;
      throw error;
    }
  }

  // GUARD 5: Cancellation Reason Guard (cancelled)
  if (newStatus === 'cancelled') {
    const reason = reqBody.cancellation_reason || reqBody.reason || appointment.cancellation_reason;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      const error = new Error('يجب تحديد سبب إلغاء الموعد.');
      error.statusCode = 400;
      throw error;
    }
  }
}

module.exports = {
  VALID_STATUSES,
  ALLOWED_TRANSITIONS,
  VALID_CANCELLATION_REASONS,
  validateAndAssertTransition
};
