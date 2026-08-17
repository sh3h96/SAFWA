import { useQuery } from '@tanstack/react-query';
import { financialsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function ViewInvoiceModal({ invoiceId, onClose }) {
  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => financialsAPI.getInvoiceById(invoiceId),
    enabled: !!invoiceId
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">تفاصيل الفاتورة</h2>
            {!isLoading && invoice && (
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                invoice.status === 'مدفوعة' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {invoice.status}
              </span>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-8">
          {isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-20 bg-slate-100 rounded-2xl w-full" />
              <div className="space-y-3">
                <div className="h-6 bg-slate-100 rounded w-1/2" />
                <div className="h-6 bg-slate-100 rounded w-1/3" />
                <div className="h-6 bg-slate-100 rounded w-2/3" />
              </div>
              <div className="h-16 bg-slate-100 rounded-xl w-full" />
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-rose-500">
              <span className="material-symbols-outlined text-4xl mb-4">error</span>
              <p>حدث خطأ أثناء تحميل الفاتورة</p>
            </div>
          ) : invoice ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">رقم الفاتورة</p>
                  <p className="font-mono font-bold text-slate-800">#INV-{invoice.invoiceId}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">تاريخ الإصدار</p>
                  <p className="font-bold text-slate-800">{invoice.transactionDate}</p>
                </div>
              </div>

              {/* Customer Info Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">العميل</p>
                    <p className="font-bold text-slate-700 text-sm">{invoice.customer?.name}</p>
                    <p className="font-mono text-slate-500 text-xs mt-0.5" dir="ltr">{invoice.customer?.phone}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">المركبة</p>
                    <p className="font-bold text-slate-700 text-sm">{invoice.vehicle?.make || invoice.vehicle?.model}</p>
                    <p className="font-mono text-slate-500 text-xs mt-0.5">{invoice.vehicle?.plateNumber}</p>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-500">أجور اليد</span>
                  <span className="font-mono font-bold text-slate-700">{formatCurrency(Number(invoice.costs?.laborCost || 0))}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-500">قيمة قطع الغيار</span>
                  <span className="font-mono font-bold text-slate-700">{formatCurrency(Number(invoice.costs?.partsCost || 0))}</span>
                </div>
                
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-3 mt-3">
                  <span className="font-medium text-slate-800">الإجمالي قبل الخصم</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrency(Number(invoice.costs?.laborCost || 0) + Number(invoice.costs?.partsCost || 0))}
                  </span>
                </div>

                {(invoice.costs?.discount > 0) && (
                  <div className="flex justify-between items-center text-sm text-rose-600">
                    <span className="font-bold">الخصم ({invoice.costs.discount}%)</span>
                    <span className="font-mono font-bold">- {formatCurrency(invoice.costs.discountAmount)}</span>
                  </div>
                )}
              </div>

              {/* Final Total */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="bg-primary/5 rounded-xl p-4 flex justify-between items-center border border-primary/10">
                  <span className="font-bold text-primary">الإجمالي النهائي</span>
                  <span className="text-2xl font-bold font-mono text-primary">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
                >
                  إغلاق
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-2 w-2/3 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  طباعة الفاتورة
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
