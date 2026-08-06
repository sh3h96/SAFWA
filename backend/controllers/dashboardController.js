const { Vehicle, Appointment, TechnicalReport, Invoice, SparePart, User } = require('../models');
const { Op } = require('sequelize');

module.exports = {
  // GET /api/dashboard/metrics
  getMetrics: async (req, res) => {
    try {
      // 1. Total Revenue Today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const invoicesToday = await Invoice.sum('total_amount', {
        where: {
          created_at: {
            [Op.gte]: today
          }
        }
      });
      const revenue = invoicesToday || 0;

      // 2. Cars in Workshop (Using TechnicalReports that are active)
      const carsInWorkshop = await TechnicalReport.count({
        where: {
          status: {
            [Op.in]: ['pending', 'in_progress', 'waiting_parts']
          }
        }
      });
      const capacity = 30; // Hardcoded capacity for now
      const capacityPercent = Math.round((carsInWorkshop / capacity) * 100);

      // 3. Pending Appointments
      const pendingAppointments = await Appointment.count({
        where: {
          status: 'pending'
        }
      });

      // 4. Stock Alerts (SpareParts with low stock)
      const lowStockCount = await SparePart.count({
        where: {
          stock_quantity: {
            [Op.lte]: 10 // Assuming 10 is the threshold
          }
        }
      });

      const metrics = [
        {
          id: 'revenue',
          icon: 'payments',
          iconBgClass: 'bg-success-bg',
          iconColorClass: 'text-success-text',
          label: 'إجمالي إيرادات اليوم',
          value: revenue.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          suffix: 'ر.س',
          trend: { direction: 'up', value: '+14%' }, // Note: We need a previous day comparison for a real trend
        },
        {
          id: 'cars',
          icon: 'directions_car',
          iconBgClass: 'bg-info-bg',
          iconColorClass: 'text-info-text',
          label: 'سيارات في الورشة',
          value: `${carsInWorkshop}/${capacity}`,
          caption: `السعة: ${capacityPercent}%`,
          progress: { value: capacityPercent, colorClass: 'bg-primary-container' },
        },
        {
          id: 'appointments',
          icon: 'calendar_month',
          iconBgClass: 'bg-warning-bg',
          iconColorClass: 'text-warning-text',
          label: 'مواعيد قيد الانتظار',
          value: `${pendingAppointments} مواعيد`,
        },
        {
          id: 'stock-alerts',
          icon: 'inventory_2',
          iconBgClass: 'bg-danger-bg',
          iconColorClass: 'text-danger-text',
          label: 'تنبيهات نقص المخزون',
          value: `${lowStockCount} قطع`,
          valueClass: 'text-danger-text',
          borderVariant: 'border-2 border-danger-text/20',
          pulse: lowStockCount > 0,
        },
      ];
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/dashboard/charts
  getCharts: async (req, res) => {
    try {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ 
          date: d, 
          dayName: d.toLocaleDateString('ar-SA', { weekday: 'long' }),
          revenue: 0, 
          laborCost: 0 
        });
      }

      // Group Repair Types
      const typeCounts = await TechnicalReport.findAll({
        attributes: ['repair_type', [TechnicalReport.sequelize.fn('COUNT', TechnicalReport.sequelize.col('id')), 'count']],
        group: ['repair_type']
      });

      let totalOrders = 0;
      const typeDistribution = typeCounts.map(tc => {
        const count = parseInt(tc.getDataValue('count'));
        totalOrders += count;
        return { type: tc.repair_type, count };
      });

      const types = typeDistribution.map((t, index) => {
        const colors = ['bg-primary', 'bg-primary-container', 'bg-secondary', 'bg-warning-text'];
        return {
          type: t.type,
          percentage: totalOrders > 0 ? Math.round((t.count / totalOrders) * 100) : 0,
          dotClass: colors[index % colors.length]
        };
      });

      const chartData = {
        revenueChart: {
          timeRange: 'آخر 7 أيام',
          timeRangeOptions: ['آخر 7 أيام', 'آخر 30 يوم'],
          legend: [
            { label: 'الإيرادات', colorClass: 'bg-primary-container' },
            { label: 'تكلفة العمالة', colorClass: 'bg-secondary/40' },
          ],
          days: days.map(d => ({
            day: d.dayName,
            revenue: d.revenue,
            laborCost: d.laborCost
          })),
        },
        repairTypes: {
          totalOrders: totalOrders || 124, // Fallback visually if db is empty
          types: types.length > 0 ? types : [
            { type: 'ميكانيكي', percentage: 40, dotClass: 'bg-primary' },
            { type: 'كهربائي', percentage: 30, dotClass: 'bg-primary-container' },
            { type: 'دوري', percentage: 20, dotClass: 'bg-secondary' },
            { type: 'سمكرة', percentage: 10, dotClass: 'bg-warning-text' },
          ],
        }
      };
      res.json(chartData);
    } catch (error) {
      console.error('Error fetching charts:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/dashboard/work-orders
  getWorkOrders: async (req, res) => {
    try {
      const reports = await TechnicalReport.findAll({
        where: {
          status: {
            [Op.in]: ['pending', 'in_progress', 'waiting_parts']
          }
        },
        /* We need proper model associations to include these. We will skip includes for now to prevent Sequelize errors if they aren't fully associated in models/index.js yet */
        limit: 10,
        order: [['created_at', 'DESC']]
      });

      const workOrders = reports.map(r => ({
        id: r.id,
        orderNumber: `#WO-${r.id}`,
        customer: { name: 'Customer ID ' + r.vehicle_id, phone: '-' }, 
        vehicle: { plate: '-', model: 'Vehicle ID ' + r.vehicle_id },
        technician: 'Tech ID ' + r.mechanic_id,
        status: { 
          label: r.status === 'in_progress' ? 'جاري الإصلاح' : r.status === 'waiting_parts' ? 'بانتظار القطع' : 'قيد الفحص', 
          variant: r.status === 'in_progress' ? 'primary' : r.status === 'waiting_parts' ? 'danger' : 'warning' 
        },
        totalCost: '0.00',
        currency: 'ر.س',
      }));

      // If database is empty, return a fallback so the frontend UI doesn't look broken during early development
      if (workOrders.length === 0) {
        return res.json([
          {
            id: 1,
            orderNumber: '#WO-8842',
            customer: { name: 'خالد العتيبي (تجريبي)', phone: '050XXXX123' },
            vehicle: { plate: 'أ ب ج 1234', model: 'تويوتا كامري 2022' },
            technician: 'م. علي حسن',
            status: { label: 'قيد الفحص', variant: 'warning' },
            totalCost: '1,250.00',
            currency: 'ر.س',
          }
        ]);
      }

      res.json(workOrders);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
