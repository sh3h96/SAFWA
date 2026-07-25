/**
 * Sidebar navigation items configuration.
 * Each item maps to a route/section in the admin dashboard.
 */
export const sidebarNavItems = [
  {
    id: 'dashboard',
    icon: 'dashboard',
    label: 'لوحة القيادة',
    path: '/admin/dashboard',
  },
  {
    id: 'workshop',
    icon: 'precision_manufacturing',
    label: 'ساحة الورشة',
    path: '/admin/workshop',
  },
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
  {
    id: 'reports',
    icon: 'assessment',
    label: 'التقارير',
    path: '/admin/reports',
  },
  {
    id: 'settings',
    icon: 'settings',
    label: 'الإعدادات',
    path: '/admin/settings',
  },
];
