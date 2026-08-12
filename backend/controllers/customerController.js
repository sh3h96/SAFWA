const { User, Vehicle, Appointment, TechnicalReport, Invoice } = require('../models');
const { Op } = require('sequelize');

module.exports = {
  // GET /api/customer/dashboard
  getDashboard: async (req, res) => {
    try {
      // 1. Get Customer Profile
      const customer = await User.findByPk(req.user.id, {
        attributes: ['name', 'email', 'phone']
      });

      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // 2. Get Customer Vehicles
      const vehicles = await Vehicle.findAll({
        where: { client_id: req.user.id }
      });
      const formattedVehicles = vehicles.map(v => ({
        id: v.id,
        model: `${v.make} ${v.model}`,
        plateNumber: v.license_plate
      }));

      // 3. Get Active Repair for this customer
      const activeAppointment = await Appointment.findOne({
        where: {
          client_id: req.user.id,
          status: {
            [Op.in]: ['pending', 'awaiting_assignment', 'under_inspection', 'in_progress', 'waiting_parts']
          }
        },
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
          { model: TechnicalReport, as: 'report' }
        ],
        order: [['created_at', 'DESC']]
      });

      let activeRepair = null;
      if (activeAppointment) {
        const status = activeAppointment.status;
        activeRepair = {
          repairNumber: `#REP-${activeAppointment.id}`,
          vehicle: `${activeAppointment.vehicle?.make || ''} ${activeAppointment.vehicle?.model || ''}`.trim(),
          status: status,
          problemDescription: activeAppointment.problem_description,
          steps: [
            { id: 1, title: 'تم الاستلام', time: 'مكتمل', status: 'completed' },
            { id: 2, title: 'قيد الفحص', time: ['under_inspection', 'in_progress', 'waiting_parts', 'completed'].includes(status) ? 'مكتمل' : (status === 'awaiting_assignment' || status === 'pending' ? 'نشط' : 'pending'), status: ['under_inspection', 'in_progress', 'waiting_parts', 'completed'].includes(status) ? 'completed' : 'active' },
            { id: 3, title: 'قيد الإصلاح', time: status === 'in_progress' ? 'نشط' : (status === 'completed' ? 'مكتمل' : 'قيد الانتظار'), status: status === 'in_progress' ? 'active' : (status === 'completed' ? 'completed' : 'pending') },
            { id: 4, title: 'جاهزة للاستلام', time: status === 'completed' ? 'جاهز' : 'قيد الانتظار', status: status === 'completed' ? 'completed' : 'pending' }
          ]
        };
      }

      // 4. Get Recent Invoices for this customer
      const invoices = await Invoice.findAll({
        include: [{
          model: Appointment,
          as: 'appointment',
          required: true,
          where: { client_id: req.user.id },
          include: [{ model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] }]
        }],
        order: [['created_at', 'DESC']],
        limit: 3
      });

      const formattedInvoices = invoices.map(i => ({
        id: `INV-${i.id}`,
        service: i.appointment?.problem_description || 'خدمات صيانة شاملة',
        date: new Date(i.created_at).toLocaleDateString('ar-SA'),
        amount: parseFloat(i.total_amount),
        statusLabel: i.status === 'paid' ? 'مدفوع' : (i.status === 'partially_paid' ? 'مدفوع جزئياً' : 'غير مدفوع')
      }));

      const customerData = {
        profile: {
          name: customer.name,
          avatar: null
        },
        vehicles: formattedVehicles,
        activeRepair,
        recentInvoices: formattedInvoices
      };
      
      res.json(customerData);
    } catch (error) {
      console.error('Error fetching customer dashboard:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
