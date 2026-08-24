/**
 * Admin Dashboard — Work Orders mock data.
 * Matches the table rows in admin_dashboard_workshop_overview_rtl/code.html.
 */

export const workOrdersData = [
  {
    id: 1,
    orderNumber: '#WO-8842',
    customer: {
      name: 'خالد العتيبي',
      phone: '050XXXX123',
    },
    vehicle: {
      plate: 'أ ب ج 1234',
      model: 'تويوتا كامري 2022',
    },
    technician: 'م. علي حسن',
    status: {
      label: 'قيد الفحص',
      variant: 'warning',
    },
    totalCost: '1,250.00',
    currency: 'ر.س',
  },
  {
    id: 2,
    orderNumber: '#WO-8839',
    customer: {
      name: 'سارة الغامدي',
      phone: '055XXXX998',
    },
    vehicle: {
      plate: 'د هـ و 5678',
      model: 'هيونداي توسان 2021',
    },
    technician: 'م. سامي كمال',
    status: {
      label: 'جاري الإصلاح',
      variant: 'primary',
    },
    totalCost: '2,840.00',
    currency: 'ر.س',
  },
  {
    id: 3,
    orderNumber: '#WO-8835',
    customer: {
      name: 'فهد بن سلمان',
      phone: '059XXXX445',
    },
    vehicle: {
      plate: 'ر ز س 9012',
      model: 'لكزس ES 2023',
    },
    technician: 'م. ماجد العمري',
    status: {
      label: 'بانتظار القطع',
      variant: 'danger',
    },
    totalCost: '4,120.50',
    currency: 'ر.س',
  },
  {
    id: 4,
    orderNumber: '#WO-8831',
    customer: {
      name: 'محمد القحطاني',
      phone: '054XXXX771',
    },
    vehicle: {
      plate: 'ط ك ل 3456',
      model: 'نيسان باترول 2020',
    },
    technician: 'م. إبراهيم فؤاد',
    status: {
      label: 'جاري الإصلاح',
      variant: 'primary',
    },
    totalCost: '950.00',
    currency: 'ر.س',
  },
];
