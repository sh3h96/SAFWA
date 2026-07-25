/**
 * Categorized Sidebar navigation items configuration.
 * Groups items logically into: Overview, Operations, Management, and System.
 */
export const sidebarNavGroups = [
  {
    id: 'overview',
    title: 'الرئيسية والعملاء',
    items: [
      {
        id: 'dashboard',
        icon: 'dashboard',
        label: 'لوحة القيادة',
        path: '/admin/dashboard',
      },
      {
        id: 'customer',
        icon: 'person',
        label: 'لوحة تحكم العميل',
        path: '/admin/customer',
      },
    ],
  },
  {
    id: 'operations',
    title: 'عمليات الورشة والصيانة',
    items: [
      {
        id: 'booking',
        icon: 'edit_calendar',
        label: 'حجز موعد جديد',
        path: '/admin/booking',
      },
      {
        id: 'workshop',
        icon: 'precision_manufacturing',
        label: 'ساحة الورشة',
        path: '/admin/workshop',
      },
      {
        id: 'technician',
        icon: 'build',
        label: 'طاولة عمل الفني',
        path: '/admin/technician',
      },
      {
        id: 'inspection',
        icon: 'fact_check',
        label: 'طلبات الفحص',
        path: '/admin/inspection',
      },
      {
        id: 'reports',
        icon: 'garage',
        label: 'مرآب وسجل الصيانة',
        path: '/admin/reports',
      },
    ],
  },
  {
    id: 'management',
    title: 'الإدارة والمالية',
    items: [
      {
        id: 'inventory',
        icon: 'inventory_2',
        label: 'المخزن',
        path: '/admin/inventory',
      },
      {
        id: 'invoices',
        icon: 'receipt_long',
        label: 'الفواتير',
        path: '/admin/invoices',
      },
      {
        id: 'users',
        icon: 'group',
        label: 'المستخدمين',
        path: '/admin/users',
      },
    ],
  },
  {
    id: 'system',
    title: 'النظام والإعدادات',
    items: [
      {
        id: 'settings',
        icon: 'settings',
        label: 'الإعدادات',
        path: '/admin/settings',
      },
    ],
  },
];

// Flat export for backwards compatibility
export const sidebarNavItems = sidebarNavGroups.flatMap((group) => group.items);
