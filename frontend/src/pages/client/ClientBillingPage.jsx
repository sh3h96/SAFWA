import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAPI } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ViewInvoiceModal from '../../components/admin/ViewInvoiceModal';

export default function ClientBillingPage() {
  const queryClient = useQueryClient();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const { data: invoicesRaw = [], isLoading, isError } = useQuery({
    queryKey: ['client', 'invoices'],
    queryFn: clientAPI.getMyInvoices
  });

  const payMutation = useMutation({
    mutationFn: (id) => clientAPI.payInvoice(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'invoices'] });
    }
  });

  const invoices = invoicesRaw.map(inv => ({
    id: inv.id,
    originalId: inv.originalId || inv.id,
    displayId: inv.id,
    date: inv.date,
    vehicle: inv.vehicle || 'مركبة غير مسجلة', // Fallback if vehicle info is missing
    items: inv.items || [{ name: inv.description || 'خدمات صيانة', cost: inv.amount }],
    total: inv.amount,
    status: inv.status
  }));

  if (isLoading) return <PageLoader />;

  if (isError) return (
    <div className="text-center py-12 text-rose-500">
      <span className="material-symbols-outlined text-4xl mb-4">error</span>
      <p>حدث خطأ أثناء تحميل الفواتير</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">الفواتير والمدفوعات</h1>
        <p className="text-slate-500 mt-2 text-sm">سجل فواتير الصيانة وحالة الدفع</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {invoices.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد فواتير حالية</h3>
            <p className="text-slate-500 text-sm max-w-xs">جميع حساباتك مسددة ولا توجد فواتير مستحقة.</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <div 
              key={invoice.id} 
              className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold mb-2 bg-slate-50 text-slate-500 font-mono">
                    {invoice.displayId}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800">{invoice.vehicle}</h3>
                  <p className="text-xs text-slate-400 mt-1">{invoice.date}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  invoice.status === 'paid' 
                    ? 'bg-teal-50 text-teal-600' 
                    : 'bg-rose-50 text-rose-600'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {invoice.status === 'paid' ? 'check_circle' : 'error'}
                  </span>
                  {invoice.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}
                </div>
              </div>

              {/* Items List */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-3 flex-1">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">{item.name}</span>
                    <span className="font-mono text-slate-800">{item.cost} ر.س</span>
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-slate-200 border-dashed flex justify-between font-bold">
                  <span className="text-slate-800">الإجمالي</span>
                  <span className="text-primary font-mono text-lg">{invoice.total} ر.س</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedInvoiceId(invoice.originalId)}
                  className="flex-1 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all duration-300 flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  عرض التفاصيل
                </button>
                {invoice.status === 'unpaid' && (
                  <button 
                    onClick={() => payMutation.mutate(invoice.originalId)}
                    disabled={payMutation.isPending}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 hover:shadow-lg transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-70"
                  >
                    {payMutation.isPending ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                        جاري الدفع...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">credit_card</span>
                        دفع الآن
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedInvoiceId && (
        <ViewInvoiceModal 
          invoiceId={selectedInvoiceId} 
          onClose={() => setSelectedInvoiceId(null)} 
        />
      )}
    </div>
  );
}
