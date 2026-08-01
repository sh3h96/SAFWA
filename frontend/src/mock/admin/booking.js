export const bookingResponse = {
  vehicles: [
    {
      id: 'v_book_1',
      model: 'لكزس ES350 2022',
      lastServiceDate: '12-10-2023',
      plateNumber: 'ق و ر 4 5 6 7'
    },
    {
      id: 'v_book_2',
      model: 'تويوتا كامري 2023',
      lastServiceDate: 'لا توجد سجلات صيانة سابقة',
      plateNumber: 'أ ب ج 1 2 3 4'
    }
  ],
  services: [
    {
      id: 'srv_1',
      title: 'تغيير زيت المحرك',
      icon: 'oil_barrel'
    },
    {
      id: 'srv_2',
      title: 'المكابح',
      icon: 'eject'
    },
    {
      id: 'srv_3',
      title: 'فحص الكهرباء',
      icon: 'electric_bolt'
    },
    {
      id: 'srv_4',
      title: 'إصلاح التكييف',
      icon: 'ac_unit'
    }
  ],
  availableDates: [
    { dayName: 'الأحد', dayNumber: '15', month: 'أكتوبر' },
    { dayName: 'الاثنين', dayNumber: '16', month: 'أكتوبر' },
    { dayName: 'الثلاثاء', dayNumber: '17', month: 'أكتوبر' },
    { dayName: 'الأربعاء', dayNumber: '18', month: 'أكتوبر' },
    { dayName: 'الخميس', dayNumber: '19', month: 'أكتوبر' }
  ],
  availableTimeSlots: [
    '09:00 AM',
    '11:30 AM',
    '02:00 PM',
    '04:30 PM'
  ]
};
