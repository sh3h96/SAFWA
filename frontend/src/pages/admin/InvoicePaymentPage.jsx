import { useState } from 'react';
import LicensePlate from '../../components/common/LicensePlate';
import AlertBanner from '../../components/common/AlertBanner';
import PaymentSuccessModal from '../../components/invoices/PaymentSuccessModal';
import { currentInvoiceResponse } from '../../mock/admin/invoices';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function InvoicePaymentPage() {
  const invoice = currentInvoiceResponse;
  const [selectedPayment, setSelectedPayment] = useState('applepay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // Calculate totals
  const subtotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const vatAmount = subtotal * invoice.vatRate;
  const totalAmount = subtotal + vatAmount;

  const handlePayNow = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccessOpen(true);
    }, 1500);
  };

  return (
    <div className="max-w-[1320px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center pb-4 border-b border-border-slate">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1">الفاتورة الضريبية الرقمية</h1>
          <p className="text-sm text-secondary">عرض تفاصيل الفاتورة وإتمام عملية السداد.</p>
        </div>
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-secondary hover:text-primary transition-all text-sm font-bold"
        >
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
          <span>العودة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Invoice Card (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-border-slate rounded-xl shadow-sm overflow-hidden">
            {/* Invoice Top Bar */}
            <div className="p-8 border-b border-border-slate flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-primary">صفوة SAFWA</span>
                </div>
                <h2 className="text-xl font-bold text-primary">فاتورة ضريبية</h2>
                <div className="flex flex-col gap-0.5">
                  <span className="data-mono text-sm text-secondary">ID: {invoice.invoiceId}</span>
                  <span className="data-mono text-xs text-secondary">VAT ID: {invoice.vatId}</span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-2 border border-border-slate rounded-lg shrink-0">
                <div className="w-32 h-32 bg-surface-container flex flex-col items-center justify-center relative group overflow-hidden rounded">
                  <span className="material-symbols-outlined text-primary text-5xl">qr_code_2</span>
                  <span className="text-[9px] font-bold text-primary opacity-60 mt-1">{invoice.qrCodeText}</span>
                </div>
              </div>
            </div>

            {/* Info Grid (Customer & Vehicle) */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-border-slate">
              {/* Customer Info */}
              <div className="space-y-3">
                <h3 className="font-bold text-base border-r-4 border-primary px-3 text-on-background">
                  معلومات العميل
                </h3>
                <div className="space-y-1 pr-4 text-sm text-on-background">
                  <p className="font-bold">{invoice.customer.name}</p>
                  <p className="text-secondary">{invoice.customer.address}</p>
                  <p className="text-secondary">{invoice.customer.city}</p>
                  <p className="data-mono text-secondary mt-1">{invoice.customer.phone}</p>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="space-y-3">
                <h3 className="font-bold text-base border-r-4 border-primary px-3 text-on-background">
                  بيانات المركبة
                </h3>
                <div className="bg-surface-container-low p-4 rounded-lg flex flex-col gap-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary">الموديل:</span>
                    <span className="font-bold text-on-background">{invoice.vehicle.model}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary">رقم اللوحة:</span>
                    <LicensePlate plateNumber={invoice.vehicle.plateNumber} />
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-8 overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-secondary text-sm font-bold">
                    <th className="p-4">الوصف</th>
                    <th className="p-4 text-center">الكمية</th>
                    <th className="p-4">سعر الوحدة</th>
                    <th className="p-4">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-slate text-sm">
                  {invoice.items.map((item) => {
                    const itemTotal = item.quantity * item.unitPrice;
                    return (
                      <tr key={item.id}>
                        <td className="p-4">
                          <div className="font-bold text-on-background">{item.name}</div>
                          <div className="text-xs text-secondary">{item.description}</div>
                        </td>
                        <td className="p-4 text-center data-mono">
                          {String(item.quantity).padStart(2, '0')}
                        </td>
                        <td className="p-4 data-mono">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="p-4 data-mono font-bold text-on-background">
                          {formatCurrency(itemTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="p-8 bg-surface-container-low flex flex-col items-end gap-3 text-sm border-t border-border-slate">
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-secondary">المجموع الفرعي:</span>
                <span className="data-mono font-bold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-secondary">ضريبة القيمة المضافة (15%):</span>
                <span className="data-mono font-bold">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="h-px w-full max-w-xs bg-border-slate my-1" />
              <div className="flex justify-between w-full max-w-xs items-center p-4 bg-primary-container text-on-primary-container rounded-lg shadow-sm">
                <span className="font-bold text-base">الإجمالي النهائي:</span>
                <span className="data-mono text-xl font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Info Alert Banner */}
          <AlertBanner 
            variant="info"
            icon="info"
            message="هذه الفاتورة معتمدة من هيئة الزكاة والضريبة والجمارك وتعتبر وثيقة أصلية لعملية الشراء."
            animate={false}
          />
        </div>

        {/* Sidebar / Payment Controls (4 cols) */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-border-slate rounded-xl p-6 shadow-sm sticky top-24">
            <h3 className="text-lg font-bold text-on-background mb-6">إتمام عملية السداد</h3>

            {/* Payment Options */}
            <div className="space-y-3 mb-6">
              {/* Option 1: Apple Pay */}
              <label 
                onClick={() => setSelectedPayment('applepay')}
                className="relative block cursor-pointer"
              >
                <div className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                  selectedPayment === 'applepay' 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border-slate hover:bg-surface-container-low'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-black rounded flex items-center justify-center p-1">
                      <span className="text-white text-xs font-bold font-mono">Pay</span>
                    </div>
                    <span className="font-bold text-sm text-on-background">Apple Pay</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayment === 'applepay' ? 'border-primary bg-primary' : 'border-border-slate'
                  }`}>
                    {selectedPayment === 'applepay' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              </label>

              {/* Option 2: Card */}
              <label 
                onClick={() => setSelectedPayment('card')}
                className="relative block cursor-pointer"
              >
                <div className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                  selectedPayment === 'card' 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border-slate hover:bg-surface-container-low'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-2xl">credit_card</span>
                    <span className="font-bold text-sm text-on-background">بطاقة مدى / فيزا</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayment === 'card' ? 'border-primary bg-primary' : 'border-border-slate'
                  }`}>
                    {selectedPayment === 'card' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              </label>

              {/* Option 3: Cash */}
              <label 
                onClick={() => setSelectedPayment('cash')}
                className="relative block cursor-pointer"
              >
                <div className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                  selectedPayment === 'cash' 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border-slate hover:bg-surface-container-low'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-2xl">payments</span>
                    <span className="font-bold text-sm text-on-background">سداد نقدي (في المركز)</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayment === 'cash' ? 'border-primary bg-primary' : 'border-border-slate'
                  }`}>
                    {selectedPayment === 'cash' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              onClick={handlePayNow}
              disabled={isProcessing}
              className="w-full bg-primary-container text-white py-4 rounded-xl font-bold hover:bg-teal-hover active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">lock</span>
                  <span>سداد الآن • {formatCurrency(totalAmount)}</span>
                </>
              )}
            </button>

            <p className="text-xs text-secondary text-center mt-5 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm text-success-text">verified_user</span>
              <span>معاملة آمنة ومشفرة بواسطة نظام صفوة</span>
            </p>

            {/* PDF & Share Actions */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border-slate">
              <button 
                onClick={() => toast.success('جاري تحميل الفاتورة بصيغة PDF...')}
                className="flex flex-col items-center gap-1 p-3 hover:bg-surface-container rounded-lg transition-colors group text-xs text-secondary"
              >
                <span className="material-symbols-outlined text-lg group-hover:text-primary">download</span>
                <span>تحميل PDF</span>
              </button>
              <button 
                onClick={() => toast.success('تم نسخ رابط الفاتورة')}
                className="flex flex-col items-center gap-1 p-3 hover:bg-surface-container rounded-lg transition-colors group text-xs text-secondary"
              >
                <span className="material-symbols-outlined text-lg group-hover:text-primary">share</span>
                <span>مشاركة</span>
              </button>
            </div>
          </div>

          {/* Loyalty Program Banner */}
          <div className="relative overflow-hidden rounded-xl bg-[#0D1F2D] p-6 text-white h-44 flex flex-col justify-end shadow-md">
            <div className="relative z-10 space-y-1">
              <h4 className="font-bold text-base text-primary-fixed">انضم لبرنامج الولاء</h4>
              <p className="text-xs text-slate-300">
                اكسب {invoice.loyaltyPoints} نقطة من هذه العملية واستبدلها بخصومات مستقبلية.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Payment Success Confirmation Modal */}
      <PaymentSuccessModal 
        isOpen={isSuccessOpen}
        transactionRef={invoice.transactionRef}
        transactionDate={invoice.transactionDate}
        onClose={() => setIsSuccessOpen(false)}
      />
    </div>
  );
}
