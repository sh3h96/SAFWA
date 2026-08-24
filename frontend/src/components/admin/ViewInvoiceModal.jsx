import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialsAPI, paymentsAPI, handoverAPI, appointmentsAPI, getErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import TechnicalReportViewModal from '../mechanic/TechnicalReportViewModal';
import { useAuth } from '../../context/AuthContext';

export default function ViewInvoiceModal({ invoiceId, appointmentId, onClose, onHandoverSuccess }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const queryClient = useQueryClient();
  const [showReportModal, setShowReportModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Fetch invoice details
  const { data: invoice, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => financialsAPI.getInvoiceById(invoiceId),
    enabled: !!invoiceId
  });

  const resolvedAppId = appointmentId || invoice?.appointment_id || invoice?.appointmentId;

  // Fetch appointment details (for technical report & handover status verification)
  const { data: appointment } = useQuery({
    queryKey: ['appointment', resolvedAppId],
    queryFn: () => appointmentsAPI.getById(resolvedAppId),
    enabled: !!resolvedAppId
  });

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: (data) => paymentsAPI.recordPayment(invoiceId, data),
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: 'تم تسجيل الدفعة بنجاح' });
      setPayAmount('');
      refetch();
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['financialSummary']);
      queryClient.invalidateQueries(['appointment', resolvedAppId]);
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getErrorMessage(err, 'فشل تسجيل الدفعة') });
    }
  });

  // Final Handover Mutation
  const handoverMutation = useMutation({
    mutationFn: () => handoverAPI.performHandover(resolvedAppId),
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: 'تم تسليم المركبة وإكمال الموعد بنجاح!' });
      queryClient.invalidateQueries(['appointments']);
      queryClient.invalidateQueries(['appointment', resolvedAppId]);
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['financialSummary']);
      if (onHandoverSuccess) onHandoverSuccess(data);
      setTimeout(() => {
        onClose();
      }, 1200);
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: getErrorMessage(err, 'فشل عملية تسليم المركبة') });
    }
  });

  const handlePaySubmit = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ type: 'error', message: 'يرجى إدخال مبلغ دفع صحيح أكبر من صفر.' });
      return;
    }
    setFeedback({ type: '', message: '' });
    recordPaymentMutation.mutate({
      amount: amountNum,
      payment_method: payMethod
    });
  };

  const handleHandoverClick = () => {
    setFeedback({ type: '', message: '' });
    handoverMutation.mutate();
  };

  const remainingBalance = invoice?.remainingBalance !== undefined ? invoice.remainingBalance : 0;
  const isFullyPaid = invoice?.rawStatus === 'paid' || (invoice?.status === 'مدفوعة' && remainingBalance <= 0.001);
  const currentAppStatus = appointment?.status || invoice?.appointmentStatus;
  const isReadyForPickup = currentAppStatus === 'ready_for_pickup';
  const isCompleted = currentAppStatus === 'completed';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">فاتورة الصيانة والخدمات</h2>
            {!isLoading && invoice && (
              <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                isFullyPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                invoice.rawStatus === 'partially_paid' || invoice.status === 'مدفوعة جزئياً' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-rose-50 text-rose-600 border border-rose-200'
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

        {/* Content Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          {isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-20 bg-slate-100 rounded-2xl w-full" />
              <div className="h-40 bg-slate-100 rounded-2xl w-full" />
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-rose-500">
              <span className="material-symbols-outlined text-4xl mb-4">error</span>
              <p>حدث خطأ أثناء تحميل الفاتورة</p>
            </div>
          ) : invoice ? (
            <>
              {feedback.message && (
                <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  <span className="material-symbols-outlined text-base">
                    {feedback.type === 'success' ? 'check_circle' : 'warning'}
                  </span>
                  {feedback.message}
                </div>
              )}

              {/* Header Info Bar */}
              <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">رقم الفاتورة</p>
                  <p className="font-mono font-bold text-slate-800 text-base">#INV-{invoice.invoiceId}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">تاريخ الإصدار</p>
                  <p className="font-bold text-slate-800 text-sm">{invoice.transactionDate}</p>
                </div>
              </div>

              {/* Customer & Vehicle Info Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-between items-center text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">العميل</p>
                  <p className="font-bold text-slate-800">{invoice.customer?.name}</p>
                  <p className="font-mono text-slate-500" dir="ltr">{invoice.customer?.phone}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">المركبة</p>
                  <p className="font-bold text-slate-800">{invoice.vehicle?.make} {invoice.vehicle?.model}</p>
                  <p className="font-mono text-slate-500">{invoice.vehicle?.plateNumber}</p>
                </div>
              </div>

              {/* Itemized Parts & Labor Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                  <span>تفاصيل الخدمات وقطع الغيار</span>
                  {appointment && (
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">assignment</span>
                      عرض التقرير الفني
                    </button>
                  )}
                </h4>

                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {/* Labor Row */}
                  <div className="p-3.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">أجور اليد والصيانة</p>
                      <p className="text-[11px] text-slate-400">تكلفة العمالة المعتمدة من الإدارة</p>
                    </div>
                    <span className="font-mono font-bold text-slate-800">{formatCurrency(Number(invoice.costs?.laborCost || 0))}</span>
                  </div>

                  {/* Parts Items */}
                  {invoice.items && invoice.items.length > 0 && invoice.items.map((item, idx) => (
                    <div key={item.id || idx} className="p-3.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.description || item.name}</p>
                        <p className="text-[11px] text-slate-400">الكمية: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-lg">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>الإجمالي الكلي للفاتورة:</span>
                  <span className="font-mono font-bold text-white text-sm">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-emerald-400">
                  <span>المبلغ المدفوع حتى الآن:</span>
                  <span className="font-mono font-bold text-sm">{formatCurrency(invoice.totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-rose-400 pt-2 border-t border-white/10">
                  <span className="font-bold">المتبقي للسداد:</span>
                  <span className="font-mono font-bold text-base">{formatCurrency(remainingBalance)}</span>
                </div>
              </div>

              {/* Payment Recording Section (If remaining balance > 0 and user is admin) */}
              {isAdmin && remainingBalance > 0.001 && (
                <form onSubmit={handlePaySubmit} className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70 space-y-3">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-amber-600">payments</span>
                    تسجيل دفعة جديدة (جزئية / كاملة)
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`المبلغ (الحد الأقصى ${remainingBalance})`}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="cash">نقداً (Cash)</option>
                      <option value="card">بطاقة (Card)</option>
                      <option value="transfer">تحويل بانكي (Transfer)</option>
                    </select>
                    <button
                      type="submit"
                      disabled={recordPaymentMutation.isLoading}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                    >
                      {recordPaymentMutation.isLoading ? 'جاري...' : 'تسجيل الدفعة'}
                    </button>
                  </div>
                </form>
              )}

              {/* Payment History Log */}
              {invoice.payments && invoice.payments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">سجل المدفوعات المسجلة</h4>
                  <div className="space-y-1.5">
                    {invoice.payments.map((p, idx) => (
                      <div key={p.id || idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                        <span className="font-mono text-slate-600">{new Date(p.paidAt).toLocaleString('ar-YE')}</span>
                        <span className="font-bold text-slate-700">{p.paymentMethod === 'cash' ? 'نقداً' : p.paymentMethod === 'card' ? 'بطاقة' : 'تحويل'}</span>
                        <span className="font-mono font-bold text-emerald-600">+{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-3 justify-between items-center">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors"
          >
            إغلاق
          </button>

          <div className="flex gap-2">
            {/* Explicit Admin Handover Button */}
            {isAdmin && isReadyForPickup && (
              <button 
                type="button"
                onClick={handleHandoverClick}
                disabled={!isFullyPaid || handoverMutation.isLoading}
                title={!isFullyPaid ? 'يجب سداد الفاتورة بالكامل قبل تسليم المركبة' : 'تسليم المركبة وإنهاء الموعد'}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-2"
              >
                {handoverMutation.isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري التسليم...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">verified</span>
                    إنهاء وتسليم المركبة
                  </>
                )}
              </button>
            )}

            {isCompleted && (
              <span className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-200">
                <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                تم التسليم والإكمال
              </span>
            )}

            <button 
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              طباعة
            </button>
          </div>
        </div>
      </div>

      {/* Technical Report View Modal */}
      {showReportModal && appointment && (
        <TechnicalReportViewModal
          task={appointment}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
