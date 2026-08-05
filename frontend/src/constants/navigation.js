export const adminNavGroups = [
  {
    id: 'admin_overview',
    title: 'الإدارة والتشغيل',
    items: [
      {
        id: 'admin_appointments',
        icon: 'event_available',
        label: 'التحكم بالمواعيد',
        path: '/admin/appointments',
      },
      {
        id: 'admin_reviews',
        icon: 'star_rate',
        label: 'مراقبة الجودة',
        path: '/admin/reviews',
      },
      {
        id: 'admin_inventory',
        icon: 'inventory_2',
        label: 'إدارة المخزون',
        path: '/admin/inventory',
      },
    ],
  },
  {
    id: 'admin_management',
    title: 'المالية والنظام',
    items: [
      {
        id: 'admin_financials',
        icon: 'account_balance',
        label: 'الإدارة المالية',
        path: '/admin/financials',
      },
      {
        id: 'admin_users',
        icon: 'manage_accounts',
        label: 'إدارة المستخدمين',
        path: '/admin/users',
      },
    ],
  },
];

export const clientNavGroups = [
  {
    id: 'client_main',
    title: 'مركباتي ومواعيدي',
    items: [
      {
        id: 'client_vehicles',
        icon: 'directions_car',
        label: 'إدارة المركبات',
        path: '/client/vehicles',
      },
      {
        id: 'client_appointments',
        icon: 'history',
        label: 'سجل المواعيد',
        path: '/client/appointments',
      },
      {
        id: 'client_booking',
        icon: 'edit_calendar',
        label: 'حجز موعد',
        path: '/client/booking',
      },
    ],
  },
  {
    id: 'client_financials',
    title: 'الفواتير والتقييم',
    items: [
      {
        id: 'client_billing',
        icon: 'receipt_long',
        label: 'الفواتير والمدفوعات',
        path: '/client/billing',
      },
      {
        id: 'client_reviews',
        icon: 'rate_review',
        label: 'التقييمات',
        path: '/client/reviews',
      },
    ],
  },
];

export const mechanicNavGroups = [
  {
    id: 'mechanic_tasks',
    title: 'جدول العمل',
    items: [
      {
        id: 'mechanic_assigned_tasks',
        icon: 'assignment',
        label: 'السيارات المخصصة',
        path: '/mechanic/tasks',
      }
    ],
  },
];
