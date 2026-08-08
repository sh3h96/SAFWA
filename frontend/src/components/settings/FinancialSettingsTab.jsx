/**
 * FinancialSettingsTab — VAT rate, invoice prefix, terms, and payment methods.
 */
export default function FinancialSettingsTab({ data, onChange, onPaymentToggle }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-inverse-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              إعدادات الضريبة والفواتير
            </h3>
            <p className="text-xs text-secondary mt-1">
              ضبط النسبة المئوية لضريبة القيمة المضافة وبادئة رقم الفاتورة.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-success-bg text-success-text px-3 py-1.5 rounded-full text-xs font-bold border border-success-text/20">
            <span className="w-2 h-2 rounded-full bg-success-text animate-pulse" />
            {data.zatcaStatus}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              نسبة ضريبة القيمة المضافة (%)
            </label>
            <div className="relative">
              <input
                type="number"
                value={data.vatRate}
                onChange={(e) =>
                  onChange('financial', 'vatRate', Number(e.target.value))
                }
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-bold focus:ring-primary focus:border-primary"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-sm font-bold">
                %
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              بادئة أرقام الفواتير
            </label>
            <input
              type="text"
              value={data.invoicePrefix}
              onChange={(e) =>
                onChange('financial', 'invoicePrefix', e.target.value)
              }
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-mono focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              رقم الفاتورة القادمة
            </label>
            <input
              type="number"
              value={data.nextInvoiceNumber}
              onChange={(e) =>
                onChange('financial', 'nextInvoiceNumber', Number(e.target.value))
              }
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-mono focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-secondary mb-2">
            شروط وأحكام الفاتورة والتأمين
          </label>
          <textarea
            rows={4}
            value={data.termsAndConditions}
            onChange={(e) =>
              onChange('financial', 'termsAndConditions', e.target.value)
            }
            className="w-full bg-surface border border-outline-variant rounded-xl p-4 text-sm focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
        <h3 className="text-lg font-bold text-inverse-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">payments</span>
          طرق الدفع المتاحة للعملاء
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'cash', label: 'نقداً (Cash)', icon: 'payments' },
            { key: 'mada', label: 'مدى (Mada)', icon: 'credit_card' },
            { key: 'visa', label: 'فيزا / ماستركارد', icon: 'credit_score' },
            { key: 'bankTransfer', label: 'تحويل بنكي', icon: 'account_balance' },
          ].map((pm) => (
            <button
              type="button"
              key={pm.key}
              onClick={() => onPaymentToggle(pm.key)}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                data.paymentMethods[pm.key]
                  ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                  : 'border-outline-variant bg-surface text-secondary hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">
                {pm.icon}
              </span>
              <span className="text-xs">{pm.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  data.paymentMethods[pm.key]
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {data.paymentMethods[pm.key] ? 'مفعل' : 'معطل'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
