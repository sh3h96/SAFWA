export const customerResponse = {
  profile: {
    name: 'ألكساندر',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZA7bPHSW7ax45bhZl_T-JWwXeMiuojhagjJ45Z29dG23TTkm7pitHBNqdbgHEmStb3F0sFx3nTXxo5-xK7K99RWuIWQEavoh2JsjjhM12ykuI1fXI2R5sDvuTyv3TGda1nbWQV7fZaXPzJ-erIeQhkGWHWSp0ohT1gDlbtyvSF2PsodczmHskbsXj8pHUvK-vOPi6BpgBLxpuw2BNWjM6DtWL9-1z93a-NCyf-tk3FAxx0ttbRyP6oQeS8LFEGG67TwxJwVlEvbE'
  },
  vehicles: [
    {
      id: 'v_cust_1',
      model: 'تويوتا كامري 2023',
      plateNumber: 'أ ب ج 1 2 3 4'
    },
    {
      id: 'v_cust_2',
      model: 'لكزس ES350 2024',
      plateNumber: 'ر س د 9 8 7'
    }
  ],
  activeRepair: {
    repairNumber: '#REP-9921',
    steps: [
      {
        id: 1,
        title: 'تم الاستلام',
        time: '10:30 صباحاً',
        status: 'completed'
      },
      {
        id: 2,
        title: 'قيد الفحص',
        time: '11:15 صباحاً',
        status: 'completed'
      },
      {
        id: 3,
        title: 'قيد الإصلاح',
        time: 'جاري العمل...',
        status: 'active'
      },
      {
        id: 4,
        title: 'جاهزة للاستلام',
        time: 'متوقع 4:00 م',
        status: 'pending'
      }
    ]
  },
  recentInvoices: [
    {
      id: 'INV-2023-884',
      service: 'تغيير زيت وفلتر + فحص شامل',
      date: '15 أكتوبر 2023',
      amount: 450.00,
      status: 'paid',
      statusLabel: 'مدفوع'
    },
    {
      id: 'INV-2023-791',
      service: 'تبديل مكابح أمامية',
      date: '02 سبتمبر 2023',
      amount: 820.00,
      status: 'paid',
      statusLabel: 'مدفوع'
    },
    {
      id: 'INV-2023-642',
      service: 'فحص دوري - 50,000 كم',
      date: '12 يوليو 2023',
      amount: 1200.00,
      status: 'paid',
      statusLabel: 'مدفوع'
    }
  ]
};
