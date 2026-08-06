const { User, Vehicle, TechnicalReport, Invoice } = require('../models');

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

      // 3. Get Active Repair
      // Find the most recent active technical report for this customer's vehicles
      const vehicleIds = vehicles.map(v => v.id);
      let activeRepair = null;
      
      if (vehicleIds.length > 0) {
        const report = await TechnicalReport.findOne({
          where: { vehicle_id: vehicleIds, status: ['pending', 'in_progress', 'waiting_parts'] },
          order: [['created_at', 'DESC']]
        });

        if (report) {
          activeRepair = {
            repairNumber: `#REP-${report.id}`,
            steps: [
              { id: 1, title: 'تم الاستلام', time: 'مكتمل', status: 'completed' },
              { id: 2, title: 'قيد الفحص', time: report.status === 'pending' ? 'نشط' : 'مكتمل', status: report.status === 'pending' ? 'active' : 'completed' },
              { id: 3, title: 'قيد الإصلاح', time: report.status === 'in_progress' ? 'نشط' : (report.status === 'pending' ? 'قيد الانتظار' : 'مكتمل'), status: report.status === 'in_progress' ? 'active' : (report.status === 'pending' ? 'pending' : 'completed') },
              { id: 4, title: 'جاهزة للاستلام', time: 'قيد الانتظار', status: 'pending' }
            ]
          };
        }
      }

      // 4. Get Recent Invoices
      const invoices = await Invoice.findAll({
        where: { client_id: req.user.id },
        order: [['created_at', 'DESC']],
        limit: 3
      });

      const formattedInvoices = invoices.map(i => ({
        id: `INV-${i.id}`,
        service: 'خدمات صيانة شاملة', // You'd join with TechnicalReport for actual service title
        date: new Date(i.created_at).toLocaleDateString('ar-SA'),
        amount: parseFloat(i.total_amount),
        statusLabel: i.status === 'paid' ? 'مدفوع' : 'غير مدفوع'
      }));

      const customerData = {
        profile: {
          name: customer.name,
          avatar: null
        },
        vehicles: formattedVehicles,
        activeRepair: activeRepair || null, // UI handles null if no active repairs
        recentInvoices: formattedInvoices
      };
      
      res.json(customerData);
    } catch (error) {
      console.error('Error fetching customer dashboard:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
