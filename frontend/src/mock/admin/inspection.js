export const inspectionResponse = {
  workOrder: '#WO-9912',
  vehicle: {
    model: 'Lexus ES350 - 2024',
    plateNumber: 'ر س د 987',
    color: 'لون أبيض لؤلؤي'
  },
  progress: {
    percentage: 65,
    completedItems: 4,
    totalItems: 6,
    statusText: 'قيد الفحص'
  },
  checklist: [
    {
      id: 'check_1',
      title: 'المحرك وناقل الحركة',
      subtitle: 'فحص الزيت، التبريد، وسلاسة التنقيل',
      status: 'pass',
      statusLabel: 'سليم (Pass)',
      statusVariant: 'success',
      icon: 'settings_slow_motion',
      checked: true
    },
    {
      id: 'check_2',
      title: 'نظام الفرامل',
      subtitle: 'فحص الفحمات، الهوبات، وزيت الفرامل',
      status: 'attention',
      statusLabel: 'يتطلب اهتمام',
      statusVariant: 'warning',
      icon: 'brightness_low',
      checked: false
    },
    {
      id: 'check_3',
      title: 'الكهرباء والبطارية',
      subtitle: 'فحص الجهد الكهربائي وعمل الأنظمة',
      status: 'pass',
      statusLabel: 'سليم (Pass)',
      statusVariant: 'success',
      icon: 'bolt',
      checked: true
    }
  ],
  photos: [
    {
      id: 'ph_1',
      title: 'صورة تآكل الفحمات',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5PET-9-ucobG_PR7aZOEtNhnpMGUc4_wXOupWZ-OBxT1bUvAtu0zrvWYb_oCAfNP17HjfR3twiCgtIVHxo3VRq84ytsvOlQwF5yIQETyEymrTJkL2yDh08p6ALwjpwxXybr54z70aBh-uSUy2JD_W0Z7Qwn0DGcBarzCUNKvI0xwRDAlQLwgE9cpGXmBRJeLrqn1PBgy8VQh1eoT6kmEt_PvYtvFwW2pm2Ugx1yNcGL57QPqoyG1gESlM_OxhUdLRqfYohLNU-Vg'
    },
    {
      id: 'ph_2',
      title: 'تسريب زيت خفيف',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNViGmGVq1Nao7XXc5_CzpvW8gcPHtVlZ9i-I-_HvKD8tZboC6VQiGq8Mr5af7__-NrEz8G_odrzNHB0e7YGJebvU4r_AyV4OD3qfIVTwq4SfVZfHb2fF5S_GuGzp_y3-40dV0GDzAvinDPAxa_43PQGPKdmg7RRjWVLspVLNPaE0xRqiUyUFo4l0_MbHMGCN9SZR-SjZSRexaRecCecr_4tVxVlBbuZR0W1Xs7_AAIPspSH6tB-btPgt4hrO9GDBUn62fbv-b0tY'
    }
  ],
  partsCatalog: [
    {
      id: 'part_1',
      name: 'فلتر زيت أصلي',
      sku: 'SKU: LEX-OIL-442',
      icon: 'oil_barrel',
      quantity: 1
    },
    {
      id: 'part_2',
      name: 'فحمات فرامل أمامية',
      sku: 'SKU: LEX-BRK-990',
      icon: 'settings_input_component',
      quantity: 1
    }
  ]
};
