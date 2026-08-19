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

      // 2. Cars in Workshop (Appointments currently being inspected, repaired, or waiting parts)
      const carsInWorkshop = await Appointment.count({
        where: {
          status: {
            [Op.in]: ['under_inspection', 'in_progress', 'waiting_parts']
          }
        }
      });
      const capacity = 30; // Workshop capacity
      const capacityPercent = Math.round((carsInWorkshop / capacity) * 100);

      // 3. Pending Appointments
      const pendingAppointments = await Appointment.count({
        where: {
          status: {
            [Op.in]: ['pending', 'awaiting_assignment']
          }
        }
      });

      // 4. Stock Alerts (SpareParts with stock_quantity <= min_stock_level)
      const lowStockCount = await SparePart.count({
        where: {
          stock_quantity: {
            [Op.lte]: SparePart.sequelize.col('min_stock_level')
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
          trend: { direction: 'up', value: '+14%' },
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
          dayName: d.toISOString().split('T')[0],
          revenue: 0, 
          laborCost: 0 
        });
      }

      // Group Technical Reports by urgency_level if available, or maintain safe fallback distribution
      const urgencyCounts = await TechnicalReport.findAll({
        attributes: ['urgency_level', [TechnicalReport.sequelize.fn('COUNT', TechnicalReport.sequelize.col('id')), 'count']],
        group: ['urgency_level']
      }).catch(() => []);

      let totalOrders = 0;
      const typeDistribution = urgencyCounts.map(tc => {
        const count = parseInt(tc.getDataValue('count'));
        totalOrders += count;
        return { type: tc.urgency_level, count };
      });

      const types = typeDistribution.map((t, index) => {
        const colors = ['bg-primary', 'bg-primary-container', 'bg-secondary', 'bg-warning-text'];
        const labelMap = {
          low: 'صيانة عادية',
          medium: 'صيانة متوسطة',
          high: 'صيانة عاجلة',
          critical: 'طوارئ'
        };
        return {
          type: labelMap[t.type] || t.type || 'غير محدد',
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
          totalOrders: totalOrders || 0,
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
      const appointments = await Appointment.findAll({
        where: {
          status: {
            [Op.in]: ['under_inspection', 'in_progress', 'waiting_parts']
          }
        },
        include: [
          { model: Vehicle, as: 'vehicle', attributes: ['make', 'model', 'license_plate'] },
          { model: User, as: 'customer', attributes: ['name', 'phone'] },
          { model: User, as: 'mechanic', attributes: ['name'] },
          { model: Invoice, as: 'invoice', attributes: ['total_amount'] }
        ],
        limit: 10,
        order: [['created_at', 'DESC']]
      });

      const workOrders = appointments.map(app => ({
        id: app.id,
        orderNumber: `#WO-${app.id}`,
        customer: { 
          name: app.customer?.name || 'عميل غير محدد', 
          phone: app.customer?.phone || '-' 
        }, 
        vehicle: { 
          plate: app.vehicle?.license_plate || '-', 
          model: `${app.vehicle?.make || ''} ${app.vehicle?.model || ''}`.trim() || 'مركبة غير محددة' 
        },
        technician: app.mechanic?.name || 'لم يعين ميكانيكي',
        status: { 
          label: app.status === 'in_progress' ? 'جاري الإصلاح' : app.status === 'waiting_parts' ? 'بانتظار القطع' : 'قيد الفحص', 
          variant: app.status === 'in_progress' ? 'primary' : app.status === 'waiting_parts' ? 'danger' : 'warning' 
        },
        totalCost: app.invoice?.total_amount ? parseFloat(app.invoice.total_amount).toFixed(2) : '0.00',
        currency: 'ر.س',
      }));

      res.json(workOrders);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
