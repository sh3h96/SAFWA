import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { financialsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import PageLoader from '../../components/common/PageLoader';
import ViewInvoiceModal from '../../components/admin/ViewInvoiceModal';

export default function FinancialsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: reports = [], isLoading, isError } = useQuery({
    queryKey: ['financials', 'reports', debouncedSearch],
    queryFn: () => financialsAPI.getPendingReports(debouncedSearch),
    placeholderData: keepPreviousData
  });

  const issueInvoiceMutation = useMutation({
    mutationFn: financialsAPI.issueInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials', 'reports'] });
    }
  });

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [discount, setDiscount] = useState(0);

  const handleIssueInvoice = (e) => {
    e.preventDefault();
    issueInvoiceMutation.mutate({
      appointment_id: selectedReport.appointment_id,
      labor_cost: laborCost,
      parts_cost: partsCost,
      discount: Number(discount)
    }, {
      onSuccess: () => {
        setIsInvoiceModalOpen(false);
        setLaborCost(''); setPartsCost(''); setDiscount(0); setSelectedReport(null);
      }
    });
  };

  const openModal = (report) => {
    setSelectedReport(report);
    setPartsCost(report.approvedPartsCost ? report.approvedPartsCost.toFixed(2) : '');
    setIsInvoiceModalOpen(true);
  };

  if (isLoading) return <PageLoader />;

  if (isError) return (
    <div className="text-center py-12 text-rose-500">
      <span className="material-symbols-outlined text-4xl mb-4">error</span>
      <p>حدث خطأ أثناء تحميل البيانات</p>
    </div>
  );

  const stats = [
    { label: 'إيرادات اليوم', value: reports.filter(r => r.status === 'invoiced').reduce((acc, curr) => acc + (curr.amount || 0), 0), icon: 'payments', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'فواتير غير مسددة', value: reports.filter(r => r.status === 'invoiced').length, icon: 'pending_actions', color: 'text-rose-500', bg: 'bg-rose-50' }, // Assuming all invoiced are unpaid for now in this demo stats
    { label: 'تقارير تنتظر التسعير', value: reports.filter(r => r.status === 'pending_invoice').length, icon: 'assignment', color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">المالية والفواتير</h1>
        <p className="text-slate-500 mt-2 text-sm">متابعة الإيرادات وإصدار الفواتير للتقارير الفنية المكتملة.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] p-6 flex items-center gap-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800 font-mono">
                {stat.label.includes('تقارير') ? stat.value : formatCurrency(stat.value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reports Ready for Invoicing */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">التقارير الفنية المكتملة</h2>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              type="text"
              placeholder="ابحث برقم التقرير، العميل، اللوحة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pr-12 pl-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
            />
          </div>
        </div>

        <div className="p-2">
          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => {
                if (report.status === 'invoiced') {
                  setSelectedInvoiceId(report.invoice_id);
                } else if (report.status === 'pending_invoice') {
                  openModal(report);
                }
              }}
              className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors rounded-2xl mx-2 my-1"
            >
              <div className="flex items-center gap-4 mb-4 md:mb-0 pointer-events-none">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{report.vehicle}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{report.id}</span>
                    <span>العميل: {report.client}</span>
                    <span>• {report.date}</span>
                  </div>
                </div>
              </div>

              <div>
                {report.status === 'pending_invoice' ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); openModal(report); }}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">request_quote</span>
                    إصدار فاتورة
                  </button>
                ) : (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedInvoiceId(report.invoice_id); }}
                      className="border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-bold shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      عرض الفاتورة
                    </button>
                    <span className="font-mono font-bold text-slate-700">{formatCurrency(report.amount)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsInvoiceModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-800">إصدار فاتورة</h2>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100"><span className="material-symbols-outlined text-sm">close</span></button>
            </div>

            <form onSubmit={handleIssueInvoice} className="p-8 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl mb-6">
                <span className="text-xs text-slate-500 block mb-1">المركبة</span>
                <span className="font-bold text-slate-800">{selectedReport?.vehicle} - {selectedReport?.client}</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">أجور اليد (ر.س)</label>
                  <input required type="number" value={laborCost} onChange={e => setLaborCost(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-lg font-mono outline-none focus:ring-2 focus:ring-primary/20 text-left" placeholder="0.00" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">قيمة قطع الغيار (ر.س)</label>
                  <input required type="number" value={partsCost} onChange={e => setPartsCost(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-lg font-mono outline-none focus:ring-2 focus:ring-primary/20 text-left" placeholder="0.00" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">الخصم (%)</label>
                  <input required type="number" min="0" max="100" step="1" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-lg font-mono outline-none focus:ring-2 focus:ring-primary/20 text-left" placeholder="0" />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-800">الإجمالي النهائي:</span>
                  <span className="text-2xl font-bold font-mono text-primary">
                    {(() => {
                      const subtotal = (Number(laborCost) || 0) + (Number(partsCost) || 0);
                      const discountAmount = subtotal * ((Number(discount) || 0) / 100);
                      return formatCurrency(subtotal - discountAmount);
                    })()}
                  </span>
                </div>
              </div>

              <button disabled={issueInvoiceMutation.isPending} type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm flex justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                {issueInvoiceMutation.isPending ? 'جاري الإصدار...' : 'إصدار الفاتورة وإرسالها للعميل'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {selectedInvoiceId && (
        <ViewInvoiceModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

    </div>
  );
}
