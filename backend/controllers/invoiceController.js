const { Invoice, InvoiceItem, Payment, User, Vehicle, Appointment, TechnicalReport, RequiredPart, SparePart, sequelize } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/auditLogger');

module.exports = {
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
            if (rp.status === 'approved' && rp.partDetails) {
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
          date: new Date(app.scheduled_date || app.created_at).toLocaleDateString('ar-SA'),
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

  // POST /api/invoices/issue
  issueInvoice: async (req, res) => {
    try {
      const { appointment_id, labor_cost, parts_cost } = req.body;

      if (!appointment_id) {
        return res.status(400).json({ message: 'appointment_id is required' });
      }

      const appointment = await Appointment.findByPk(appointment_id);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Check if invoice already exists for this appointment
      const existingInvoice = await Invoice.findOne({ where: { appointment_id } });
      if (existingInvoice) {
        return res.status(400).json({ message: 'Invoice already exists for this appointment', invoice: existingInvoice });
      }

      const laborCostNum = Math.max(0, parseFloat(labor_cost) || 0);
      const partsCostNum = Math.max(0, parseFloat(parts_cost) || 0);
      const total_amount = laborCostNum + partsCostNum;

      if (total_amount <= 0) {
        return res.status(400).json({ message: 'Invoice total amount must be greater than zero' });
      }

      const t = await sequelize.transaction();
      try {
        const invoice = await Invoice.create({
          appointment_id,
          total_amount,
          status: 'unpaid',
          issued_at: new Date()
        }, { transaction: t });

        if (laborCostNum > 0) {
          await InvoiceItem.create({
            invoice_id: invoice.id,
            description: 'أجور اليد والخدمة',
            quantity: 1,
            unit_price: laborCostNum,
            total_price: laborCostNum
          }, { transaction: t });
        }

        if (partsCostNum > 0) {
          await InvoiceItem.create({
            invoice_id: invoice.id,
            description: 'تكلفة قطع الغيار المعتمدة',
            quantity: 1,
            unit_price: partsCostNum,
            total_price: partsCostNum
          }, { transaction: t });
        }

        await t.commit();

        await logAudit({
          req,
          action: 'INVOICE_ISSUED',
          entityType: 'Invoice',
          entityId: invoice.id,
          newValues: { appointment_id, total_amount, laborCostNum, partsCostNum, status: 'unpaid' }
        });

        res.status(201).json({ message: 'Invoice issued successfully', invoice });
      } catch (err) {
        await t.rollback();
        throw err;
      }
    } catch (error) {
      console.error('Error issuing invoice:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/invoices/:id
  getInvoice: async (req, res) => {
    try {
      const invoice = await Invoice.findByPk(req.params.id, {
        include: [
          {
            model: Appointment,
            as: 'appointment',
            include: [
              { model: User, as: 'customer', attributes: ['name', 'phone'] },
              { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] }
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
        return res.status(404).json({ message: 'Invoice not found' });
      }

      // Ownership Verification: Client can only view their own invoice
      if (req.user.role === 'client') {
        if (!invoice.appointment || Number(invoice.appointment.client_id) !== Number(req.user.id)) {
          return res.status(404).json({ message: 'Invoice not found' });
        }
      }

      const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalAmount = parseFloat(invoice.total_amount);
      const remainingBalance = Math.max(0, totalAmount - totalPaid);

      const statusMap = {
        paid: 'مدفوعة',
        partially_paid: 'مدفوعة جزئياً',
        unpaid: 'غير مسددة'
      };

      const appointment = invoice.appointment;

      let partsCost = 0;
      let laborCost = 0;
      if (invoice.items && invoice.items.length > 0) {
        partsCost = invoice.items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
        laborCost = Math.max(0, totalAmount - partsCost);
      } else {
        laborCost = Math.min(150, totalAmount);
        partsCost = Math.max(0, totalAmount - laborCost);
      }

      const invoiceData = {
        invoiceId: invoice.id,
        status: statusMap[invoice.status] || 'غير مسددة',
        rawStatus: invoice.status,
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
        items: (invoice.items || []).map(item => ({
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
      console.error('Error fetching invoice:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/invoices/:id/pay
  payInvoice: async (req, res) => {
    try {
      const invoice = await Invoice.findByPk(req.params.id, {
        include: [
          { model: Payment, as: 'payments' },
          { model: Appointment, as: 'appointment' }
        ]
      });

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      // Ownership Verification: Client can only pay their own invoice
      if (req.user.role === 'client') {
        if (!invoice.appointment || Number(invoice.appointment.client_id) !== Number(req.user.id)) {
          return res.status(404).json({ message: 'Invoice not found' });
        }
      }

      const existingPaid = (invoice.payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalAmount = parseFloat(invoice.total_amount);
      const remainingBalance = Math.max(0, totalAmount - existingPaid);

      if (remainingBalance <= 0.001) {
        return res.status(400).json({ message: 'Invoice is already fully paid' });
      }

      let paymentAmount;
      const rawInput = req.body.amount !== undefined ? req.body.amount : req.body.amount_paid;

      if (rawInput !== undefined && rawInput !== null) {
        paymentAmount = parseFloat(rawInput);
      } else {
        paymentAmount = remainingBalance;
      }

      if (isNaN(paymentAmount) || !isFinite(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ message: 'Invalid payment amount. Amount must be a positive number.' });
      }

      if (paymentAmount > remainingBalance + 0.01) {
        return res.status(400).json({
          message: `Payment amount (${paymentAmount}) exceeds remaining balance (${remainingBalance.toFixed(2)})`,
          remainingBalance
        });
      }

      const payment_method = req.body.payment_method || 'credit_card';
      const oldInvoiceStatus = invoice.status;

      // Perform inside Sequelize Transaction for financial safety
      const t = await sequelize.transaction();
      try {
        const newPayment = await Payment.create({
          invoice_id: invoice.id,
          amount: paymentAmount,
          payment_method,
          paid_at: new Date()
        }, { transaction: t });

        const newTotalPaid = existingPaid + paymentAmount;
        let newStatus = 'unpaid';
        if (newTotalPaid >= totalAmount - 0.01) {
          newStatus = 'paid';
        } else if (newTotalPaid > 0) {
          newStatus = 'partially_paid';
        }

        await invoice.update({ status: newStatus }, { transaction: t });
        await t.commit();

        await logAudit({
          req,
          action: 'PAYMENT_RECORDED',
          entityType: 'Invoice',
          entityId: invoice.id,
          newValues: { payment_id: newPayment.id, amount: paymentAmount, payment_method, newStatus }
        });

        if (newStatus !== oldInvoiceStatus) {
          await logAudit({
            req,
            action: 'INVOICE_STATUS_CHANGED',
            entityType: 'Invoice',
            entityId: invoice.id,
            oldValues: { status: oldInvoiceStatus },
            newValues: { status: newStatus }
          });
        }

        return res.json({
          message: 'Payment processed successfully',
          payment: newPayment,
          invoiceStatus: newStatus,
          totalAmount,
          totalPaid: newTotalPaid,
          remainingBalance: Math.max(0, totalAmount - newTotalPaid)
        });
      } catch (err) {
        await t.rollback();
        throw err;
      }
    } catch (error) {
      console.error('Error processing payment:', error);
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
          date: new Date(inv.created_at).toLocaleDateString('ar-SA'),
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
