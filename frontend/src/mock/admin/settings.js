/**
 * Mock Settings data for SAFWA Auto Service & Maintenance Center
 */
export const initialSettings = {
  // 1. General Workshop Information
  general: {
    workshopName: 'مركز صفوة لصيانة وتجديد السيارات',
    crNumber: '1010894523',
    vatNumber: '310495829100003',
    phone: '+966 11 456 7890',
    mobile: '+966 50 123 4567',
    email: 'info@safwa-auto.sa',
    website: 'https://safwa-auto.sa',
    address: 'حي الصحافة، طريق الملك فهد، الرياض، المملكة العربية السعودية',
    city: 'الرياض',
    postalCode: '13315',
    currency: 'ر.س',
    logoUrl: '/assets/images/safwa-logo.png',
  },

  // 2. Financial & Invoicing Settings
  financial: {
    vatRate: 15,
    vatEnabled: true,
    invoicePrefix: 'SAF-INV-',
    nextInvoiceNumber: 1048,
    currencySymbol: 'ر.س',
    termsAndConditions: '1. الضمان على قطع الغيار والأجور مدته 30 يوماً أو 1000 كم أيهما أسبق.\n2. السيارة المتروكة في المركز لأكثر من 5 أيام بعد الجاهزية تفرض عليها رسوم أرضيات بواقع 50 ر.س/يوم.',
    paymentMethods: {
      cash: true,
      mada: true,
      visa: true,
      bankTransfer: true,
      tabby: false,
    },
    zatcaPhase: 'Phase 2 (ZATCA Integration Active)',
    zatcaStatus: 'متصل بهيئة الزكاة والضريبة والجمارك',
  },

  // 3. Working Hours & Capacity
  booking: {
    workingDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'السبت'],
    offDays: ['الجمعة'],
    shiftStart: '08:00',
    shiftEnd: '20:00',
    breakStart: '12:30',
    breakEnd: '13:30',
    maxDailyAppointments: 24,
    slotDurationMinutes: 45,
    autoConfirmAppointments: false,
    sendSmsReminder: true,
    reminderHoursBefore: 24,
  },

  // 4. Notifications & Integrations
  notifications: {
    whatsappStatusUpdates: true,
    whatsappInvoicePdf: true,
    smsInspectionAlerts: true,
    emailDailyReport: true,
    emailLowStockAlert: true,
    lowStockThreshold: 5,
    managerEmail: 'manager@safwa-auto.sa',
    whatsappApiProvider: 'Unifonic WhatsApp API',
    smsGatewayStatus: 'متصل (Balance: 2,450 SMS)',
  },

  // 5. Security & System Preferences
  security: {
    twoFactorAuth: true,
    sessionTimeoutMinutes: 60,
    forcePasswordChangeDays: 90,
    systemLanguage: 'ar',
    themeMode: 'light',
    autoBackupEnabled: true,
    backupFrequency: 'يومي (الساعة 02:00 صباحاً)',
    lastBackupDate: '2026-07-25 02:00 AM',
  },
};
