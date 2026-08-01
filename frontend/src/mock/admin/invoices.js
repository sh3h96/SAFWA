export const currentInvoiceResponse = {
  invoiceId: '#INV-2026-8891',
  vatId: '300012345600003',
  qrCodeText: 'SAFWA SECURE PAY',
  customer: {
    name: 'محمد العتيبي',
    address: 'حي النرجس، شارع الملك عبدالعزيز',
    city: 'الرياض، المملكة العربية السعودية',
    phone: '+966 50 XXX XXXX'
  },
  vehicle: {
    model: 'Lexus ES350 - 2024',
    plateNumber: 'أ ب ج 1234'
  },
  items: [
    {
      id: 'item_1',
      name: 'زيت محرك تخليقي 5W-30',
      description: 'تغيير كامل مع الفلتر الأصلي',
      quantity: 4,
      unitPrice: 45.00
    },
    {
      id: 'item_2',
      name: 'أجور يد - تغيير زيت وفلتر',
      description: 'فحص نقاط الصيانة الـ 10',
      quantity: 1,
      unitPrice: 50.00
    }
  ],
  vatRate: 0.15,
  loyaltyPoints: 13,
  transactionRef: '#TX-55291-AZ',
  transactionDate: '2026-03-15'
};
