export const workshopResponse = {
  unassignedVehicles: [
    {
      id: 'uv_1',
      makeModel: 'تويوتا كامري',
      yearColor: '2023 • فضي',
      plateNumber: 'ح ص ل ٥٥١',
      waitingTime: 'منذ ٣٠ دقيقة'
    },
    {
      id: 'uv_2',
      makeModel: 'مازدا 6',
      yearColor: '2022 • أحمر',
      plateNumber: 'ر ق م ٩٩٢',
      waitingTime: 'منذ ٤٥ دقيقة'
    }
  ],
  bays: [
    {
      id: 'bay_1',
      number: 1,
      title: 'منصة ميكانيكا',
      status: 'working',
      statusText: 'المنصة تعمل بكفاءة',
      badgeText: 'جاري الإصلاح',
      badgeVariant: 'success',
      vehicleName: 'نيسان باترول',
      plateNumber: 'L R N 1010',
      technician: 'أحمد سالم',
      progress: 75,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNM6ljK4WzdJ6w1V28jql7BDmCKrMyQDPHEkcPiB3pyqRIkpDCDTNKaiF5A4mFydxSriZFrokJNjG1kXxrrpyXVLs8qG5j1uDe4RK7CsZu8zSSMVH6DNED_Vlr0lmTPGAAL8D4L7dNqotLFy1IryogYGiyzX6OgwfGeRcJxdcNUY8ZlWayUmHsgvpr2-Iy48z6UHahDZnTbot2WAt1QboVkxVX0tqvI_4igQYH1rsx6i0yii7beRlHZr897m1Srd_47O5Z5oOGogw'
    },
    {
      id: 'bay_2',
      number: 2,
      title: 'منصة كهرباء',
      status: 'ready',
      statusText: 'المنصة تعمل بكفاءة',
      badgeText: 'جاهز للتسليم',
      badgeVariant: 'success',
      vehicleName: 'فورد توروس',
      plateNumber: 'K H D 2022',
      technician: 'خالد محمد',
      completedMessage: 'تم اكتمال الفحص بنجاح',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvIIXnDj7Uwy8NHIxn9dfqYt3lQHJw-2VG_EzPMykAk9vPIltMyZNhLWIh8oFrowbEAcS96ntZ96s7R6fVSuGei7cJrqnw-aQ7iqePLZFDt6FaFh8TMQPzO-W2wXhG_q6w3Ie-KSv8j7vd7oR06vlD-UB2D3MGZpXYfSZ2RYKSHNEMQTJbjplt56Q6aqwBo00MPyq3LPCd-Lvmt3Ve_WcxQ7u4dO0TZw1Wyw_-y_62qOAWXF6NPDBksbnymOTyZsUxXvtE5-S7OtY'
    },
    {
      id: 'bay_3',
      number: 3,
      title: 'منصة خدمة سريعة',
      status: 'delayed',
      statusText: 'متوقف مؤقتاً',
      badgeText: 'بانتظار قطع الغيار',
      badgeVariant: 'warning',
      vehicleName: 'هيونداي إلنترا',
      plateNumber: 'A A A 4444',
      technician: 'عمر',
      warningNotice: {
        item: 'فلتر زيت - غير متوفر',
        eta: 'يتوفر خلال: ٢ ساعة'
      },
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIZ_MeY2fDmzlE8Ut1UduZI4plzTkFUuMuDTH_DxRO4J--N6JSDmhiYEBeDo38KsjDr1cqEVSHL8-DjDLLq222WYKutyfanBR0SRUOTB8zbtBAbcY1QUUDqx9wFu5jsiYYEwOpL4f39dvFpp77bu-fpbekSwI6DFla3WlOAhVtpHNFZpBPm2Sh4ltl5tr3ptm-yxyLHI2_BLDlH6rSUvcdU1EJZd3Rx6s7vTB0GX-BX4PzPjbH9XOGaoj0s8BW5bMnbeqAmT71xUM'
    },
    {
      id: 'bay_4',
      number: 4,
      title: 'منصة فارغة',
      status: 'empty',
      statusText: 'جاهزة لاستقبال مركبة جديدة'
    }
  ],
  technicians: [
    'أحمد سالم',
    'محمد فهد',
    'سعد العتيبي',
    'ياسر القحطاني',
    'خالد محمد',
    'عمر'
  ],
  serviceStatuses: [
    'جاري الإصلاح',
    'تم الانتهاء',
    'بانتظار قطع الغيار',
    'بانتظار موافقة العميل'
  ]
};
