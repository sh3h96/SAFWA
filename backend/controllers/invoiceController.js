'use strict';

const { Invoice, InvoiceItem, Payment, User, Vehicle, Appointment, TechnicalReport, RequiredPart, SparePart, WalkInCustomer, WalkInVisit } = require('../models');
const { Op } = require('sequelize');
const InvoiceService = require('../services/invoiceService');
const PaymentService = require('../services/paymentService');

module.exports = {
  // GET /api/invoices/financial-summary
  getFinancialSummary: async (req, res) => {
    try {
      const { from, to } = req.query;

      const now = new Date();

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const yesterdayStart = new Date(now);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(now);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setHours(23, 59, 59, 999);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      let rangeStart = todayStart;
      let rangeEnd = todayEnd;

      if (from && typeof from === 'string' && from.includes('-')) {
        const parts = from.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          rangeStart = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        }
      }

      if (to && typeof to === 'string' && to.includes('-')) {
        const parts = to.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          rangeEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
        }
      } else if (from && !to && typeof from === 'string' && from.includes('-')) {
        const parts = from.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          rangeEnd = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
        }
      }

      const todayRevenueSum = await Payment.sum('amount', {
        where: { paid_at: { [Op.between]: [todayStart, todayEnd] } }
      });
      const todayRevenue = todayRevenueSum || 0;

      const yesterdayRevenueSum = await Payment.sum('amount', {
        where: { paid_at: { [Op.between]: [yesterdayStart, yesterdayEnd] } }
      });
      const yesterdayRevenue = yesterdayRevenueSum || 0;

      const monthRevenueSum = await Payment.sum('amount', {
        where: { paid_at: { [Op.between]: [monthStart, monthEnd] } }
      });
      const monthRevenue = monthRevenueSum || 0;

      const rangeRevenueSum = await Payment.sum('amount', {
        where: { paid_at: { [Op.between]: [rangeStart, rangeEnd] } }
      });
      const rangeRevenue = rangeRevenueSum || 0;

      const paymentsCount = await Payment.count({
        where: { paid_at: { [Op.between]: [rangeStart, rangeEnd] } }
      });

      const averagePayment = paymentsCount > 0 ? parseFloat((rangeRevenue / paymentsCount).toFixed(2)) : 0;

      const recentPaymentsRaw = await Payment.findAll({
        where: { paid_at: { [Op.between]: [rangeStart, rangeEnd] } },
        include: [
          {
            model: Invoice,
            as: 'invoice',
            include: [
              {
                model: Appointment,
                as: 'appointment',
                include: [
                  { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
                  { model: User, as: 'customer', attributes: ['id', 'name', 'phone'] },
                  {
                    model: WalkInVisit,
                    as: 'walkInVisit',
                    include: [{ model: WalkInCustomer, as: 'customer', attributes: ['id', 'name', 'phone'] }]
                  }
                ]
              },
              { model: Payment, as: 'payments' }
            ]
          }
        ],
        order: [['paid_at', 'DESC']],
        limit: 50
      });

      const recentPayments = recentPaymentsRaw.map(p => {
        const inv = p.invoice;
        const app = inv ? inv.appointment : null;

        let customerName = 'عميل زائر';
        let customerPhone = '-';
        let customerId = null;
        let isWalkIn = false;

        if (app && app.customer) {
          customerName = app.customer.name;
          customerPhone = app.customer.phone || '-';
          customerId = app.customer.id;
        } else if (app && app.walkInVisit && app.walkInVisit.customer) {
          customerName = app.walkInVisit.customer.name;
          customerPhone = app.walkInVisit.customer.phone || '-';
          customerId = app.walkInVisit.customer.id;
          isWalkIn = true;
        }

        let vehiclePlate = '-';
        let vehicleModel = 'مركبة غير محددة';
        let vehicleId = null;

        if (app && app.vehicle) {
          vehiclePlate = app.vehicle.license_plate || '-';
          vehicleModel = `${app.vehicle.make || ''} ${app.vehicle.model || ''}`.trim();
          vehicleId = app.vehicle.id;
        } else if (app && app.walkInVisit) {
          vehiclePlate = app.walkInVisit.vehicle_license_plate || '-';
          vehicleModel = `${app.walkInVisit.vehicle_make || ''} ${app.walkInVisit.vehicle_model || ''}`.trim();
        }

        const totalAmount = inv ? parseFloat(inv.total_amount) : 0;
        const totalPaid = inv && inv.payments ? inv.payments.reduce((s, pay) => s + parseFloat(pay.amount), 0) : parseFloat(p.amount);
        const remainingBalance = inv ? Math.max(0, parseFloat((totalAmount - totalPaid).toFixed(2))) : 0;

        let invoiceStatus = 'unpaid';
        if (totalPaid >= totalAmount - 0.001) invoiceStatus = 'paid';
        else if (totalPaid > 0) invoiceStatus = 'partially_paid';

        return {
          id: p.id,
          invoice_id: inv ? inv.id : null,
          invoiceNumber: inv ? `INV-${inv.id}` : '-',
          appointment_id: app ? app.id : null,
          appointmentNumber: app ? `#APP-${app.id}` : '-',
          amount: parseFloat(p.amount),
          payment_method: p.payment_method,
          paid_at: p.paid_at,
          customer: { name: customerName, phone: customerPhone, id: customerId, isWalkIn },
          vehicle: { model: vehicleModel, plate: vehiclePlate, id: vehicleId },
          invoiceStatus,
          totalAmount,
          totalPaid,
          remainingBalance
        };
      });

      const allInvoices = await Invoice.findAll({
        include: [
          { model: Payment, as: 'payments' },
          {
            model: Appointment,
            as: 'appointment',
            include: [
              { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
              { model: User, as: 'customer', attributes: ['id', 'name', 'phone'] },
              {
                model: WalkInVisit,
                as: 'walkInVisit',
                include: [{ model: WalkInCustomer, as: 'customer', attributes: ['id', 'name', 'phone'] }]
              }
            ]
          }
        ]
      });

      let totalOutstandingBalance = 0;
      const unpaidInvoices = [];
      const partiallyPaidInvoices = [];

      allInvoices.forEach(inv => {
        const totalAmount = parseFloat(inv.total_amount);
        const totalPaid = (inv.payments || []).reduce((s, p) => s + parseFloat(p.amount), 0);
        const remaining = parseFloat(Math.max(0, totalAmount - totalPaid).toFixed(2));

        const app = inv.appointment;
        let customerName = 'عميل زائر';
        if (app && app.customer) customerName = app.customer.name;
        else if (app && app.walkInVisit && app.walkInVisit.customer) customerName = app.walkInVisit.customer.name;

        let vehicleModel = 'مركبة غير محددة';
        let vehiclePlate = '-';
        if (app && app.vehicle) {
          vehicleModel = `${app.vehicle.make || ''} ${app.vehicle.model || ''}`.trim();
          vehiclePlate = app.vehicle.license_plate || '-';
        } else if (app && app.walkInVisit) {
          vehicleModel = `${app.walkInVisit.vehicle_make || ''} ${app.walkInVisit.vehicle_model || ''}`.trim();
          vehiclePlate = app.walkInVisit.vehicle_license_plate || '-';
        }

        const invData = {
          id: inv.id,
          invoiceNumber: `INV-${inv.id}`,
          appointment_id: inv.appointment_id,
          totalAmount,
          totalPaid,
          remainingBalance: remaining,
          issuedAt: inv.issued_at || inv.created_at,
          customerName,
          vehicleModel,
          vehiclePlate
        };

        if (remaining > 0.001) {
          totalOutstandingBalance += remaining;
          if (totalPaid > 0) {
            partiallyPaidInvoices.push({ ...invData, status: 'partially_paid' });
          } else {
            unpaidInvoices.push({ ...invData, status: 'unpaid' });
          }
        }
      });

      const pendingAppointments = await Appointment.findAll({
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
          { model: User, as: 'customer', attributes: ['name', 'phone'] },
          { model: Invoice, as: 'invoice' },
          {
            model: TechnicalReport,
            as: 'report',
            include: [
              {
                model: RequiredPart,
                as: 'requestedParts',
                include: [{ model: SparePart, as: 'partDetails' }]
              }
            ]
          }
        ]
      });

      const awaitingPricing = [];
      pendingAppointments.forEach(app => {
        if (app.report && !app.invoice) {
          let approvedPartsCost = 0;
          if (app.report.requestedParts) {
            approvedPartsCost = app.report.requestedParts.reduce((sum, rp) => {
              if ((rp.status === 'approved' || rp.status === 'installed') && rp.partDetails) {
                return sum + (parseFloat(rp.partDetails.price) * rp.quantity);
              }
              return sum;
            }, 0);
          }

          awaitingPricing.push({
            id: `REP-${app.id}`,
            appointment_id: app.id,
            vehicle: `${app.vehicle?.make || ''} ${app.vehicle?.model || ''}`.trim() || 'مركبة غير محددة',
            client: app.customer?.name || 'عميل غير معروف',
            date: app.scheduled_date || app.created_at,
            approvedPartsCost,
            status: 'pending_invoice'
          });
        }
      });

      res.json({
        todayRevenue,
        yesterdayRevenue,
        monthRevenue,
        rangeRevenue,
        paymentsCount,
        averagePayment,
        totalOutstandingBalance: parseFloat(totalOutstandingBalance.toFixed(2)),
        unpaidInvoicesCount: unpaidInvoices.length,
        partiallyPaidInvoicesCount: partiallyPaidInvoices.length,
        awaitingPricingCount: awaitingPricing.length,
        unpaidInvoices,
        partiallyPaidInvoices,
        recentPayments,
        awaitingPricing,
        dateRange: {
          from: rangeStart.toISOString().split('T')[0],
          to: rangeEnd.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      res.status(500).json({ message: 'Server error fetching financial summary' });
    }
  },
  // GET /api/invoices/reports
  getPendingReports: async (req, res) => {
    try {
      const { search } = req.query;

      const whereClause = {};
      if (search) {
        const searchConditions = [
          { '$customer.name$': { [Op.like]: `%${search}%` } },
          { '$customer.phone$': { [Op.like]: `%${search}%` } },
          { '$vehicle.license_plate$': { [Op.like]: `%${search}%` } }
        ];

        if (!isNaN(search) && search.trim() !== '') {
          const numericId = search.replace(/\D/g, '');
          if (numericId) {
            searchConditions.push({ id: numericId });
          } else {
            searchConditions.push({ id: search });
          }
        } else if (typeof search === 'string' && search.toUpperCase().startsWith('REP-')) {
          const numericId = search.replace(/\D/g, '');
          if (numericId) {
            searchConditions.push({ id: numericId });
          }
        }

        whereClause[Op.or] = searchConditions;
      }

      const appointments = await Appointment.findAll({
        where: whereClause,
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
          { model: User, as: 'customer', attributes: ['name', 'phone'] },
          { model: Invoice, as: 'invoice' },
          {
            model: TechnicalReport,
            as: 'report',
            include: [
              {
                model: RequiredPart,
                as: 'requestedParts',
                include: [{ model: SparePart, as: 'partDetails' }]
              }
            ]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      const reports = appointments.map(app => {
        let status = 'pending_invoice';
        let amount = 0;
        let approvedPartsCost = 0;
        let invoice_id = null;

        if (app.invoice) {
          status = 'invoiced';
          amount = parseFloat(app.invoice.total_amount);
          invoice_id = app.invoice.id;
        }

        if (app.report && app.report.requestedParts) {
          approvedPartsCost = app.report.requestedParts.reduce((sum, rp) => {
            if ((rp.status === 'approved' || rp.status === 'installed') && rp.partDetails) {
              return sum + (parseFloat(rp.partDetails.price) * rp.quantity);
            }
            return sum;
          }, 0);
        }

        return {
          id: `REP-${app.id}`,
          appointment_id: app.id,
          vehicle: `${app.vehicle?.make || ''} ${app.vehicle?.model || ''}`.trim(),
          client: app.customer?.name || 'غير معروف',
          date: app.scheduled_date || app.created_at,
          status,
          amount,
          approvedPartsCost,
          invoice_id
        };
      });

      res.json(reports);
    } catch (error) {
      console.error('Error fetching pending reports:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/invoices/issue AND POST /api/invoices
  issueInvoice: async (req, res) => {
    try {
      const appointment_id = req.body.appointment_id;
      // Accept labor cost from final_labor_price, labor_cost, or final_labor_cost
      const final_labor_price = req.body.final_labor_price !== undefined
        ? req.body.final_labor_price
        : req.body.labor_cost !== undefined ? req.body.labor_cost : req.body.final_labor_cost;

      const discount = req.body.discount || 0;

      const createdInvoice = await InvoiceService.createInvoice({
        appointment_id,
        final_labor_price,
        discount,
        req
      });

      res.status(201).json({
        message: 'تم إصدار الفاتورة الرسمية بنجاح',
        invoice: createdInvoice
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      if (statusCode === 500) {
        console.error('Error issuing invoice:', error);
      }
      res.status(statusCode).json({
        message: error.message || 'خطأ أثناء إصدار الفاتورة',
        ...(error.invoice && { invoice: error.invoice })
      });
    }
  },

  // GET /api/invoices/:id
  getInvoice: async (req, res) => {
    try {
      const result = await InvoiceService.getInvoiceById({
        invoice_id: req.params.id,
        reqUser: req.user
      });

      const { invoice, totalAmount, totalPaid, remainingBalance, derivedStatus } = result;

      const statusMap = {
        paid: 'مدفوعة',
        partially_paid: 'مدفوعة جزئياً',
        unpaid: 'غير مسددة'
      };

      const appointment = invoice.appointment;

      const items = invoice.items || [];
      const partsCost = items
        .filter(item => item.part_id !== null)
        .reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);

      const laborItem = items.find(item => item.part_id === null);
      const laborCost = laborItem ? parseFloat(laborItem.total_price || 0) : Math.max(0, totalAmount - partsCost);

      const invoiceData = {
        invoiceId: invoice.id,
        appointment_id: invoice.appointment_id,
        appointmentId: invoice.appointment_id,
        report_id: appointment?.report?.id || null,
        appointmentStatus: appointment?.status || null,
        status: statusMap[derivedStatus] || 'غير مسددة',
        rawStatus: derivedStatus,
        vatId: '300012345600003',
        qrCodeText: 'SAFWA SECURE PAY',
        customer: {
          name: appointment?.customer?.name || 'عميل غير محدد',
          address: 'العنوان غير محدد',
          city: 'المدينة غير محددة',
          phone: appointment?.customer?.phone || '-'
        },
        vehicle: {
          make: appointment?.vehicle?.make || 'غير محدد',
          model: appointment?.vehicle?.model || 'غير محدد',
          plateNumber: appointment?.vehicle?.license_plate || 'غير محدد'
        },
        costs: {
          laborCost,
          partsCost,
          discount: 0,
          discountAmount: 0
        },
        totalAmount,
        totalPaid,
        remainingBalance,
        items: items.map(item => ({
          id: item.id,
          name: item.description,
          description: item.part?.name || '-',
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price)
        })),
        payments: (invoice.payments || []).map(p => ({
          id: p.id,
          amount: parseFloat(p.amount),
          paymentMethod: p.payment_method,
          transactionId: p.transaction_id,
          paidAt: p.paid_at
        })),
        vatRate: 0.15,
        loyaltyPoints: Math.floor(totalAmount / 100),
        transactionRef: `#TX-${invoice.id}`,
        transactionDate: new Date(invoice.created_at).toISOString().split('T')[0]
      };

      res.json(invoiceData);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      if (statusCode === 500) {
        console.error('Error fetching invoice:', error);
      }
      res.status(statusCode).json({ message: error.message || 'خطأ في جلب بيانات الفاتورة' });
    }
  },

  // POST /api/invoices/:id/pay AND POST /api/invoices/:id/payments
  payInvoice: async (req, res) => {
    try {
      const invoice_id = req.params.id;
      const amount = req.body.amount !== undefined ? req.body.amount : req.body.amount_paid;
      const payment_method = req.body.payment_method || req.body.paymentMethod || 'cash';
      const transaction_id = req.body.transaction_id || req.body.transactionId || null;

      const result = await PaymentService.recordPayment({
        invoice_id,
        amount,
        payment_method,
        transaction_id,
        req
      });

      res.json({
        message: 'تم تسجيل الدفعة بنجاح',
        payment: result.payment,
        invoiceStatus: result.invoiceStatus,
        totalAmount: result.totalAmount,
        totalPaid: result.totalPaid,
        remainingBalance: result.remainingBalance
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      if (statusCode === 500) {
        console.error('Error processing payment:', error);
      }
      res.status(statusCode).json({
        message: error.message || 'خطأ أثناء تسجيل الدفعة',
        ...(error.remainingBalance !== undefined && { remainingBalance: error.remainingBalance })
      });
    }
  },

  // GET /api/invoices/:id/payments
  getInvoicePayments: async (req, res) => {
    try {
      const invoice_id = req.params.id;
      const payments = await PaymentService.getPaymentHistory({ invoice_id });
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/invoices/my
  getMyInvoices: async (req, res) => {
    try {
      const invoices = await Invoice.findAll({
        include: [
          {
            model: Appointment,
            as: 'appointment',
            required: true,
            where: { client_id: req.user.id },
            include: [{
              model: Vehicle,
              as: 'vehicle',
              attributes: ['make', 'model', 'license_plate']
            }]
          },
          {
            model: Payment,
            as: 'payments'
          }
        ],
        order: [['created_at', 'DESC']]
      });

      const formattedInvoices = invoices.map(inv => {
        const vehicle = inv.appointment && inv.appointment.vehicle
          ? `${inv.appointment.vehicle.make} ${inv.appointment.vehicle.model}`
          : 'مركبة غير محددة';

        const totalPaid = (inv.payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalAmount = parseFloat(inv.total_amount);
        const remainingBalance = Math.max(0, totalAmount - totalPaid);

        return {
          id: `INV-${inv.id}`,
          originalId: inv.id,
          date: inv.created_at,
          amount: totalAmount,
          totalPaid,
          remainingBalance,
          status: inv.status,
          description: inv.appointment?.problem_description || 'صيانة دورية وإصلاح',
          vehicle
        };
      });

      res.json(formattedInvoices);
    } catch (error) {
      console.error('Error fetching my invoices:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
