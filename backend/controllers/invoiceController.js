const { Invoice, InvoiceItem, Payment, User, Vehicle, Appointment, TechnicalReport } = require('../models');

module.exports = {
  // GET /api/invoices/reports
  getPendingReports: async (req, res) => {
    try {
      const { RequiredPart, SparePart } = require('../models');
      const { Op } = require('sequelize');
      const { search } = req.query;

      const whereClause = {};
      if (search) {
        const searchConditions = [
          { '$customer.name$': { [Op.like]: `%${search}%` } },
          { '$customer.phone$': { [Op.like]: `%${search}%` } },
          { '$vehicle.license_plate$': { [Op.like]: `%${search}%` } }
        ];
        
        // Only search by ID if it's a number to avoid DB casting errors
        if (!isNaN(search) && search.trim() !== '') {
          // You could also parse 'REP-69' into '69' if needed:
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
      
      // Find all appointments that have a technical report
      const appointments = await Appointment.findAll({
        where: whereClause,
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
          { model: User, as: 'customer', attributes: ['name', 'phone'] },
          { model: Invoice, as: 'Invoice' },
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
        
        if (app.Invoice) {
          status = 'invoiced';
          amount = parseFloat(app.Invoice.total_amount);
          invoice_id = app.Invoice.id;
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
          vehicle: `${app.vehicle?.make || ''} ${app.vehicle?.model || ''}`,
          client: app.customer?.name || 'غير معروف',
          date: new Date(app.scheduled_date || app.created_at).toLocaleDateString('ar-SA'),
          status,
          amount,
          approvedPartsCost,
          invoice_id
        };
      });

      // If empty DB, fallback to mock data
      if (reports.length === 0) {
        return res.json([
          { id: 'REP-1022', appointment_id: 1022, vehicle: 'هيونداي سوناتا', client: 'عمر خالد', date: 'اليوم', status: 'pending_invoice' },
          { id: 'REP-1019', appointment_id: 1019, vehicle: 'فورد تورس', client: 'علي محمد', date: 'أمس', status: 'invoiced', amount: 850, invoice_id: '1019' },
        ]);
      }

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
      const total_amount = Number(labor_cost) + Number(parts_cost);

      const invoice = await Invoice.create({
        appointment_id,
        total_amount,
        status: 'unpaid',
        issued_at: new Date()
      });

      res.json({ message: 'Invoice issued successfully', invoice });
    } catch (error) {
      console.error('Error issuing invoice:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/invoices/:id
  getInvoice: async (req, res) => {
    try {
      const invoice = await Invoice.findByPk(req.params.id);

      if (!invoice) {
        // Fallback for empty DB during development
        return res.json({
          invoiceId: req.params.id,
          status: 'غير مسددة',
          vatId: '300012345600003',
          qrCodeText: 'SAFWA SECURE PAY',
          customer: { name: 'محمد العتيبي (وهمي)', address: 'الرياض', city: 'الرياض', phone: '+966 50 XXX XXXX' },
          vehicle: { make: 'Lexus', model: 'ES350 - 2024', plateNumber: 'أ ب ج 1234' },
          costs: {
            laborCost: 250,
            partsCost: 180,
            discount: 10,
            discountAmount: 43
          },
          totalAmount: 387,
          items: [
            { id: 'item_1', name: 'زيت محرك', description: 'تغيير كامل', quantity: 4, unitPrice: 45.00 }
          ],
          vatRate: 0.15,
          loyaltyPoints: 13,
          transactionRef: '#TX-55291-AZ',
          transactionDate: new Date().toISOString().split('T')[0]
        });
      }

      // Normally we would query InvoiceItems related to this invoice
      const invoiceItems = await InvoiceItem.findAll({ where: { invoice_id: invoice.id } }).catch(() => []);

      // Fetch appointment to get customer and vehicle details
      const appointment = await Appointment.findByPk(invoice.appointment_id, {
        include: [
          { model: User, as: 'customer', attributes: ['name', 'phone'] },
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] }
        ]
      }).catch(() => null);

      const invoiceData = {
        invoiceId: invoice.id,
        status: invoice.status === 'paid' ? 'مدفوعة' : 'غير مسددة',
        vatId: '300012345600003',
        qrCodeText: 'SAFWA SECURE PAY',
        customer: {
          name: appointment && appointment.customer ? appointment.customer.name : 'عميل غير محدد',
          address: 'العنوان غير محدد',
          city: 'المدينة غير محددة',
          phone: appointment && appointment.customer ? appointment.customer.phone : '-'
        },
        vehicle: {
          make: appointment && appointment.vehicle ? appointment.vehicle.make : 'غير محدد',
          model: appointment && appointment.vehicle ? appointment.vehicle.model : 'غير محدد',
          plateNumber: appointment && appointment.vehicle ? appointment.vehicle.license_plate : 'غير محدد'
        },
        costs: {
          laborCost: 150,
          partsCost: parseFloat(invoice.total_amount) - 150 + 30, // dummy logic
          discount: 10,
          discountAmount: 30
        },
        totalAmount: parseFloat(invoice.total_amount),
        items: invoiceItems.map(item => ({
          id: item.id,
          name: item.description,
          description: '-',
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price)
        })),
        vatRate: 0.15,
        loyaltyPoints: Math.floor(parseFloat(invoice.total_amount) / 100),
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
      const { amount_paid, payment_method } = req.body;
      const invoice = await Invoice.findByPk(req.params.id);

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      await Payment.create({
        invoice_id: invoice.id,
        amount_paid: amount_paid || invoice.total_amount,
        payment_method: payment_method || 'credit_card',
        payment_date: new Date()
      });

      invoice.status = 'paid';
      await invoice.save();

      res.json({ message: 'Payment processed successfully', invoice });
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/invoices/my
  getMyInvoices: async (req, res) => {
    try {
      const invoices = await Invoice.findAll({
        include: [{
          model: Appointment,
          required: true,
          where: { client_id: req.user.id },
          include: [{
            model: Vehicle,
            as: 'vehicle',
            attributes: ['make', 'model', 'license_plate']
          }]
        }],
        order: [['created_at', 'DESC']]
      });

      const formattedInvoices = invoices.map(inv => {
        const vehicle = inv.Appointment && inv.Appointment.vehicle 
          ? `${inv.Appointment.vehicle.make} ${inv.Appointment.vehicle.model}` 
          : 'مركبة غير محددة';
          
        return {
          id: `INV-${inv.id}`,
          originalId: inv.id,
          date: new Date(inv.created_at).toLocaleDateString('ar-SA'),
          amount: parseFloat(inv.total_amount),
          status: inv.status, // 'unpaid' or 'paid'
          description: 'صيانة دورية وإصلاح', // mock description for now
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
