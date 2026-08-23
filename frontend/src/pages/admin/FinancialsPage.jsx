import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { financialsAPI, paymentsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import PageLoader from '../../components/common/PageLoader';
import ViewInvoiceModal from '../../components/admin/ViewInvoiceModal';
import AppointmentDetailsModal from '../../components/admin/AppointmentDetailsModal';
import UserDetailsModal from '../../components/admin/UserDetailsModal';
import VehicleDetailsModal from '../../components/admin/VehicleDetailsModal';

export default function FinancialsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Date Filter States
  const [filterPreset, setFilterPreset] = useState('today'); // 'today' | 'yesterday' | 'month' | 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Active Main Tab
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'unpaid' | 'awaiting_pricing'

  // Search & Modals State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Issue Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Compute actual date parameters for API query
  const getQueryParams = () => {
    const now = new Date();
    const formatDateStr = (d) => d.toISOString().split('T')[0];

    if (filterPreset === 'today') {
      const todayStr = formatDateStr(now);
      return { from: todayStr, to: todayStr };
    }
    if (filterPreset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDateStr(y);
      return { from: yStr, to: yStr };
    }
    if (filterPreset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: formatDateStr(startOfMonth), to: formatDateStr(endOfMonth) };
    }
    if (filterPreset === 'custom') {
      return { from: fromDate || '', to: toDate || '' };
    }
    return {};
  };

  const queryParams = getQueryParams();

  // Fetch Authoritative Financial Summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['financials', 'summary', queryParams.from, queryParams.to],
    queryFn: () => financialsAPI.getFinancialSummary(queryParams),
    placeholderData: keepPreviousData
  });

  // Issue Invoice Mutation
  const issueInvoiceMutation = useMutation({
    mutationFn: financialsAPI.issueInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      setIsInvoiceModalOpen(false);
      setLaborCost(''); setPartsCost(''); setDiscount(0); setSelectedReport(null);
    }
  });

  const handleIssueInvoiceSubmit = (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    issueInvoiceMutation.mutate({
      appointment_id: selectedReport.appointment_id,
      labor_cost: laborCost,
      parts_cost: partsCost,
      discount: Number(discount)
    });
  };

  const openIssueModal = (report) => {
    setSelectedReport(report);
    setPartsCost(report.approvedPartsCost ? report.approvedPartsCost.toFixed(2) : '');
    setIsInvoiceModalOpen(true);
  };

  if (isSummaryLoading) return <PageLoader />;

  if (isSummaryError) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 max-w-lg mx-auto shadow-sm">
          <span className="material-symbols-outlined text-5xl text-rose-500 mb-3">cloud_off</span>
          <h2 className="text-xl font-bold text-slate-800 mb-2">فشل جلب البيانات المالية</h2>
          <p className="text-sm text-slate-600 mb-6">
            {summaryError?.response?.data?.message || 'تعذر الاتصال بخادم المالية. يرجى المحاولة لاحقاً.'}
          </p>
          <button
            onClick={() => refetchSummary()}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition-all shadow-md"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const {
    todayRevenue = 0,
    yesterdayRevenue = 0,
    monthRevenue = 0,
    rangeRevenue = 0,
    paymentsCount = 0,
    averagePayment = 0,
    totalOutstandingBalance = 0,
    unpaidInvoicesCount = 0,
    partiallyPaidInvoicesCount = 0,
    awaitingPricingCount = 0,
    unpaidInvoices = [],
    partiallyPaidInvoices = [],
    recentPayments = [],
    awaitingPricing = []
  } = summary || {};

  // Filter lists based on debouncedSearch
  const filterBySearch = (list) => {
    if (!debouncedSearch) return list;
    const term = debouncedSearch.toLowerCase().trim();
    return list.filter(item => {
      const invNum = (item.invoiceNumber || '').toLowerCase();
      const cust = (item.customer?.name || item.customerName || item.client || '').toLowerCase();
      const veh = (item.vehicle?.model || item.vehicleModel || item.vehicle || '').toLowerCase();
      const plate = (item.vehicle?.plate || item.vehiclePlate || '').toLowerCase();
      const appNum = (item.appointmentNumber || item.id || '').toLowerCase();
      return invNum.includes(term) || cust.includes(term) || veh.includes(term) || plate.includes(term) || appNum.includes(term);
    });
  };

  const filteredPayments = filterBySearch(recentPayments);
  const filteredUnpaid = filterBySearch([...unpaidInvoices, ...partiallyPaidInvoices]);
  const filteredAwaiting = filterBySearch(awaitingPricing);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">

      {/* Header & Date Range Filter Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">المالية والتحليلات الرقمية</h1>
          <p className="text-slate-500 mt-1 text-sm">متابعة الإيرادات الفعلية الدقيقة والفواتير ومقبوضات الورشة authoritative metrics.</p>
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/60">
          <button
            onClick={() => setFilterPreset('today')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterPreset === 'today' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            اليوم
          </button>
          <button
            onClick={() => setFilterPreset('yesterday')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterPreset === 'yesterday' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            أمس
          </button>
          <button
            onClick={() => setFilterPreset('month')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterPreset === 'month' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            هذا الشهر
          </button>
          <button
            onClick={() => setFilterPreset('custom')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterPreset === 'custom' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            نطاق مخصص
          </button>
        </div>
      </div>

      {/* Custom Date Pickers (Shown if filterPreset === 'custom') */}
      {filterPreset === 'custom' && (
        <div className="bg-teal-50/60 border border-teal-100 rounded-3xl p-6 flex flex-wrap items-center gap-6 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-teal-800">من تاريخ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-4 py-2 bg-white border border-teal-200 rounded-xl text-sm font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-teal-800">إلى تاريخ:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-4 py-2 bg-white border border-teal-200 rounded-xl text-sm font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <span className="text-xs text-teal-700 font-medium">
            سيتم احتساب جميع المقبوضات الفعلية الممتدة حتى نهاية اليوم المحدد (23:59:59).
          </span>
        </div>
      )}

      {/* 6 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Selected Period Revenue */}
        <div className="bg-gradient-to-br from-teal-800 to-teal-900 text-white rounded-[2rem] p-6 shadow-lg shadow-teal-900/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-teal-200 uppercase tracking-wider mb-1">
              إيرادات {filterPreset === 'today' ? 'اليوم' : filterPreset === 'yesterday' ? 'أمس' : filterPreset === 'month' ? 'الشهر' : 'الفترة المحددة'}
            </p>
            <p className="text-3xl font-extrabold font-mono tracking-tight">{formatCurrency(rangeRevenue)}</p>
            <p className="text-[11px] text-teal-300/80 mt-1">عدد الدفعات: {paymentsCount} | المتوسط: {formatCurrency(averagePayment)}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-teal-200 shrink-0">
            <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
          </div>
        </div>

        {/* Card 2: Today's Revenue */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">إيرادات اليوم الفعلية</p>
            <p className="text-2xl font-bold text-slate-800 font-mono">{formatCurrency(todayRevenue)}</p>
            <p className="text-[11px] text-slate-400 mt-1">المقبوضات المسجلة اليوم فقط</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
        </div>

        {/* Card 3: Yesterday's Revenue */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">إيرادات أمس</p>
            <p className="text-2xl font-bold text-slate-800 font-mono">{formatCurrency(yesterdayRevenue)}</p>
            <p className="text-[11px] text-slate-400 mt-1">مقبوضات يوم أمس</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">history</span>
          </div>
        </div>

        {/* Card 4: Monthly Revenue */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">إيرادات هذا الشهر</p>
            <p className="text-2xl font-bold text-slate-800 font-mono">{formatCurrency(monthRevenue)}</p>
            <p className="text-[11px] text-slate-400 mt-1">إجمالي مقبوضات الشهر الحقيقي</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">calendar_month</span>
          </div>
        </div>

        {/* Card 5: Total Outstanding Balance */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">المبالغ المتبقية المستحقة</p>
            <p className="text-2xl font-bold text-rose-600 font-mono">{formatCurrency(totalOutstandingBalance)}</p>
            <p className="text-[11px] text-rose-500/80 mt-1">
              غير مسددة: {unpaidInvoicesCount} | مسددة جزئياً: {partiallyPaidInvoicesCount}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">pending_actions</span>
          </div>
        </div>

        {/* Card 6: Reports Awaiting Pricing */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">تقارير تنتظر التسعير</p>
            <p className="text-2xl font-bold text-amber-600 font-mono">{awaitingPricingCount} تقارير</p>
            <p className="text-[11px] text-amber-600/80 mt-1">فحص مكتمل بدون فاتورة</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">request_quote</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* Main Content Tabs */}
          <div className="flex items-center gap-2 bg-slate-100/70 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'payments' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-[18px]">receipt</span>
              <span>سجل المقبوضات ({filteredPayments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('unpaid')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'unpaid' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-[18px]">rule</span>
              <span>ديون ومستحقات ({filteredUnpaid.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('awaiting_pricing')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'awaiting_pricing' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
              <span>تنتظر التسعير ({filteredAwaiting.length})</span>
            </button>
          </div>

          {/* Search Filter */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              type="text"
              placeholder="ابحث برقم الفاتورة، العميل، اللوحة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
            />
          </div>
        </div>

        {/* Tab 1: Payment Transactions Table */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-16 px-4">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">payments</span>
                <p className="text-base font-bold text-slate-600">لا توجد دفعات مستلمة في هذه الفترة المحددة</p>
                <p className="text-xs text-slate-400 mt-1">جرّب تغيير فلتر التاريخ أو اختيار نطاق آخر.</p>
              </div>
            ) : (
              <table className="w-full text-right text-sm text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-6">رمز الدفعة</th>
                    <th className="py-4 px-6">الفاتورة</th>
                    <th className="py-4 px-6">العميل</th>
                    <th className="py-4 px-6">المركبة</th>
                    <th className="py-4 px-6">المبلغ المدفوع</th>
                    <th className="py-4 px-6">طريقة الدفع</th>
                    <th className="py-4 px-6">تاريخ الدفع</th>
                    <th className="py-4 px-6">حالة الفاتورة</th>
                    <th className="py-4 px-6">المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">#PAY-{p.id}</td>
                      
                      <td className="py-4 px-6">
                        {p.invoice_id ? (
                          <button
                            onClick={() => setSelectedInvoiceId(p.invoice_id)}
                            className="font-mono font-bold text-teal-700 hover:underline flex items-center gap-1"
                          >
                            <span>{p.invoiceNumber}</span>
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          </button>
                        ) : '-'}
                      </td>

                      <td className="py-4 px-6 font-medium text-slate-800">
                        {p.customer?.id && !p.customer?.isWalkIn ? (
                          <button
                            onClick={() => setSelectedUser({ id: p.customer.id, userObj: p.customer })}
                            className="hover:text-teal-700 hover:underline text-right"
                          >
                            {p.customer.name}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span>{p.customer?.name}</span>
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">زائر</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {p.vehicle?.id ? (
                          <button
                            onClick={() => setSelectedVehicle({ id: p.vehicle.id, vehicleObj: p.vehicle })}
                            className="hover:text-teal-700 hover:underline text-right font-medium"
                          >
                            {p.vehicle.model} ({p.vehicle.plate})
                          </button>
                        ) : (
                          <span>{p.vehicle?.model} ({p.vehicle?.plate})</span>
                        )}
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>

                      <td className="py-4 px-6 capitalize font-medium">
                        {p.payment_method === 'cash' ? 'نقدي (Cash)' : p.payment_method === 'card' ? 'بطاقة (Card)' : p.payment_method}
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                        {formatDate(p.paid_at)}
                      </td>

                      <td className="py-4 px-6">
                        {p.invoiceStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            مسددة بالكامل
                          </span>
                        ) : p.invoiceStatus === 'partially_paid' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            مسددة جزئياً
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            غير مسددة
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-slate-700">
                        {formatCurrency(p.remainingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Unpaid & Partially Paid Invoices */}
        {activeTab === 'unpaid' && (
          <div className="p-6">
            {filteredUnpaid.length === 0 ? (
              <div className="text-center py-16 px-4">
                <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">task_alt</span>
                <p className="text-base font-bold text-slate-700">جميع الفواتير مسددة بالكامل!</p>
                <p className="text-xs text-slate-400 mt-1">لا توجد أية مبالغ أو ديون متبقية مستحقة في الوقت الحالي.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUnpaid.map((inv) => (
                  <div key={inv.id} className="bg-slate-50/70 border border-slate-100 rounded-3xl p-6 space-y-4 hover:border-slate-200 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-bold text-slate-800 text-lg">{inv.invoiceNumber}</span>
                        <p className="text-xs text-slate-500 mt-0.5">العميل: <strong className="text-slate-700">{inv.customerName}</strong></p>
                        <p className="text-xs text-slate-500">المركبة: {inv.vehicleModel} ({inv.vehiclePlate})</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${inv.status === 'partially_paid' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                        {inv.status === 'partially_paid' ? 'مسددة جزئياً' : 'غير مسددة'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">إجمالي الفاتورة</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{formatCurrency(inv.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">المبلغ المدفوع</span>
                        <span className="text-xs font-mono font-bold text-emerald-600">{formatCurrency(inv.totalPaid)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">المبلغ المتبقي</span>
                        <span className="text-xs font-mono font-bold text-rose-600">{formatCurrency(inv.remainingBalance)}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        <span>عرض الفاتورة وتنسيق الدفع</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reports Awaiting Pricing */}
        {activeTab === 'awaiting_pricing' && (
          <div className="p-6">
            {filteredAwaiting.length === 0 ? (
              <div className="text-center py-16 px-4">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">assignment_turned_in</span>
                <p className="text-base font-bold text-slate-700">لا توجد تقارير تنتظر التسعير حالياً</p>
                <p className="text-xs text-slate-400 mt-1">جميع التقارير الفنية المكتملة تم إصدار فواتير لها بنجاح.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAwaiting.map((rep) => (
                  <div key={rep.id} className="bg-slate-50/70 border border-slate-100 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-200 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-bold text-teal-800 text-base">{rep.id}</span>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">{rep.vehicle}</h4>
                        <p className="text-xs text-slate-500">العميل: {rep.client}</p>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                        بانتظار التسعير
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">تكلفة قطع الغيار المعتمدة:</span>
                      <span className="text-sm font-mono font-bold text-slate-800">{formatCurrency(rep.approvedPartsCost)}</span>
                    </div>

                    <button
                      onClick={() => openIssueModal(rep)}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">request_quote</span>
                      إصدار فاتورة رسمية
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Issue Invoice Modal */}
      {isInvoiceModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setIsInvoiceModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">إصدار فاتورة رسمية</h2>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:bg-slate-100"><span className="material-symbols-outlined text-sm">close</span></button>
            </div>

            <form onSubmit={handleIssueInvoiceSubmit} className="p-8 space-y-5">
              <div className="bg-teal-50/70 border border-teal-100 p-4 rounded-2xl">
                <span className="text-xs text-teal-800 font-bold block mb-1">التقرير: {selectedReport.id}</span>
                <span className="font-bold text-slate-800 text-sm block">{selectedReport.vehicle}</span>
                <span className="text-xs text-slate-500 block">العميل: {selectedReport.client}</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">أجور اليد والعمالة النهائية (ر.س)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={laborCost}
                    onChange={e => setLaborCost(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono outline-none focus:ring-2 focus:ring-teal-500/20 text-left font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">قيمة قطع الغيار المعتمدة (ر.س)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={partsCost}
                    onChange={e => setPartsCost(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono outline-none focus:ring-2 focus:ring-teal-500/20 text-left font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">نسبة الخصم (%)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono outline-none focus:ring-2 focus:ring-teal-500/20 text-left font-bold"
                    placeholder="0"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-sm">الإجمالي النهائي المستحق:</span>
                  <span className="text-xl font-bold font-mono text-teal-800">
                    {(() => {
                      const subtotal = (Number(laborCost) || 0) + (Number(partsCost) || 0);
                      const discountAmount = subtotal * ((Number(discount) || 0) / 100);
                      return formatCurrency(subtotal - discountAmount);
                    })()}
                  </span>
                </div>
              </div>

              <button
                disabled={issueInvoiceMutation.isPending}
                type="submit"
                className="w-full py-4 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-sm transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                {issueInvoiceMutation.isPending ? 'جاري إصدار الفاتورة...' : 'إكتمال وتثبيت الفاتورة'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Entity Interaction Modals */}
      {selectedInvoiceId && (
        <ViewInvoiceModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {selectedAppointmentId && (
        <AppointmentDetailsModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}

      {selectedUser && (
        <UserDetailsModal
          userId={selectedUser.id}
          user={selectedUser.userObj}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {selectedVehicle && (
        <VehicleDetailsModal
          vehicleId={selectedVehicle.id}
          vehicleObj={selectedVehicle.vehicleObj}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

    </div>
  );
}
