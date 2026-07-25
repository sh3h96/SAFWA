/**
 * Admin Dashboard — Metrics, Revenue Chart, and Repair Types mock data.
 * Matches the data displayed in admin_dashboard_workshop_overview_rtl/code.html.
 */

/** Top metrics cards */
export const metricsData = [
  {
    id: 'revenue',
    icon: 'payments',
    iconBgClass: 'bg-success-bg',
    iconColorClass: 'text-success-text',
    label: 'إجمالي إيرادات اليوم',
    value: '12,450.00',
    suffix: 'ر.س',
    trend: { direction: 'up', value: '+14%' },
  },
  {
    id: 'cars',
    icon: 'directions_car',
    iconBgClass: 'bg-info-bg',
    iconColorClass: 'text-info-text',
    label: 'سيارات في الورشة',
    value: '18/24',
    caption: 'السعة: 80%',
    progress: { value: 80, colorClass: 'bg-primary-container' },
  },
  {
    id: 'appointments',
    icon: 'calendar_month',
    iconBgClass: 'bg-warning-bg',
    iconColorClass: 'text-warning-text',
    label: 'مواعيد قيد الانتظار',
    value: '7 مواعيد',
  },
  {
    id: 'stock-alerts',
    icon: 'inventory_2',
    iconBgClass: 'bg-danger-bg',
    iconColorClass: 'text-danger-text',
    label: 'تنبيهات نقص المخزون',
    value: '4 قطع',
    valueClass: 'text-danger-text',
    borderVariant: 'border-2 border-danger-text/20',
    pulse: true,
  },
];

/** Revenue vs Labor Cost — Bar chart data (7 days) */
export const revenueChartData = {
  timeRange: 'آخر 7 أيام',
  timeRangeOptions: ['آخر 7 أيام', 'آخر 30 يوم'],
  legend: [
    { label: 'الإيرادات', colorClass: 'bg-primary-container' },
    { label: 'تكلفة العمالة', colorClass: 'bg-secondary/40' },
  ],
  days: [
    { day: 'الأحد', revenue: 80, laborCost: 40 },
    { day: 'الاثنين', revenue: 65, laborCost: 35 },
    { day: 'الثلاثاء', revenue: 90, laborCost: 50 },
    { day: 'الأربعاء', revenue: 75, laborCost: 45 },
    { day: 'الخميس', revenue: 85, laborCost: 40 },
    { day: 'الجمعة', revenue: 40, laborCost: 20 },
    { day: 'السبت', revenue: 60, laborCost: 30 },
  ],
};

/** Repair Types Distribution — Donut chart data */
export const repairTypesData = {
  totalOrders: 124,
  types: [
    { type: 'ميكانيكي', percentage: 40, dotClass: 'bg-primary' },
    { type: 'كهربائي', percentage: 30, dotClass: 'bg-primary-container' },
    { type: 'دوري', percentage: 20, dotClass: 'bg-secondary' },
    { type: 'سمكرة', percentage: 10, dotClass: 'bg-warning-text' },
  ],
};
