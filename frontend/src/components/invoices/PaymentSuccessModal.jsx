/**
 * PaymentSuccessModal — Presentational modal displayed after successful invoice payment.
 */
export default function PaymentSuccessModal({
  isOpen,
  transactionRef = '#TX-55291-AZ',
  transactionDate = '2026-03-15',
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Content Container */}
      <div className="bg-surface-container-lowest relative z-10 w-full max-w-md p-8 rounded-2xl shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-success-bg text-success-text rounded-full flex items-center justify-center mx-auto shadow-sm">
          <span 
            className="material-symbols-outlined text-5xl" 
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-on-background">تم السداد بنجاح!</h2>
          <p className="text-sm text-secondary">
            تم إرسال نسخة من الفاتورة إلى بريدك الإلكتروني.
          </p>
        </div>

        <div className="bg-surface-container-low p-4 rounded-xl space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-secondary">رقم العملية:</span>
            <span className="data-mono font-bold text-on-background">{transactionRef}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-secondary">التاريخ:</span>
            <span className="data-mono font-bold text-on-background">{transactionDate}</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-teal-hover transition-colors shadow-lg active:scale-95"
        >
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
}
