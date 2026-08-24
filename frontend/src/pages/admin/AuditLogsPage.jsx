import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { auditLogsAPI, getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/formatters';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

// Action Label & Color Mapping
const actionMap = {
  AUTH_LOGIN_SUCCESS: { label: 'تسجيل دخول ناجح', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  AUTH_LOGIN_FAILED: { label: 'محاولة تسجيل دخول فاشلة', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  AUTH_LOGOUT: { label: 'تسجيل خروج', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  USER_CREATED: { label: 'إنشاء مستخدم', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  USER_UPDATED: { label: 'تعديل مستخدم', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  USER_STATUS_CHANGED: { label: 'تغيير حالة مستخدم', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ADMIN_CREATED: { label: 'إنشاء مدير', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ADMIN_STATUS_CHANGED: { label: 'تغيير حالة مدير', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  VEHICLE_CREATED: { label: 'إنشاء مركبة', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  VEHICLE_UPDATED: { label: 'تعديل مركبة', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  VEHICLE_DELETED: { label: 'حذف مركبة', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  APPOINTMENT_CREATED: { label: 'إنشاء موعد', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  APPOINTMENT_STATUS_CHANGED: { label: 'تغيير حالة موعد', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPOINTMENT_MECHANIC_ASSIGNED: { label: 'تعيين ميكانيكي', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  APPOINTMENT_MECHANIC_REMOVED: { label: 'إزالة ميكانيكي', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  PART_CREATED: { label: 'إنشاء قطعة', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  PART_UPDATED: { label: 'تعديل قطعة', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  PART_STOCK_ADJUSTED: { label: 'تعديل مخزون قطعة', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PARTS_REQUEST_SUBMITTED: { label: 'إرسال طلب قطع', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PARTS_REQUEST_APPROVED: { label: 'اعتماد طلب قطع', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTS_REQUEST_REJECTED: { label: 'رفض طلب قطع', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  INVOICE_ISSUED: { label: 'إصدار فاتورة', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  INVOICE_PAYMENT_PROCESSED: { label: 'تسجيل دفعة', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REVIEW_CREATED: { label: 'إنشاء تقييم', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  SECURITY_SUPER_ADMIN_MODIFICATION_BLOCKED: { label: 'محاولة تعديل محمية', color: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' }
};

export default function AuditLogsPage() {
  const { user: currentUser } = useAuth();

  // Filter & Pagination States
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actorUserIdFilter, setActorUserIdFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch Audit Logs
  const { data: responseData, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['auditLogs', { action: actionFilter, entity_type: entityTypeFilter, actor_user_id: actorUserIdFilter, from: fromDateFilter, to: toDateFilter, page, limit }],
    queryFn: () => auditLogsAPI.getAll({
      action: actionFilter || undefined,
      entity_type: entityTypeFilter || undefined,
      actor_user_id: actorUserIdFilter || undefined,
      from: fromDateFilter || undefined,
      to: toDateFilter || undefined,
      page,
      limit
    }),
    placeholderData: keepPreviousData,
  });

  const auditLogs = responseData?.data || [];
  const pagination = responseData?.pagination || { page: 1, limit: 20, total: auditLogs.length, totalPages: 1 };

  const handleClearFilters = () => {
    setActionFilter('');
    setEntityTypeFilter('');
    setActorUserIdFilter('');
    setFromDateFilter('');
    setToDateFilter('');
    setPage(1);
  };

  // Guard: If not Super Admin, show strict denied UI (Backend is primary, UI is defense in depth)
  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-4xl">block</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">وصول غير مصرح</h2>
        <p className="text-slate-500 text-sm">عرض سجل التدقيق (Audit Logs) محصور بحساب Super Admin فقط.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <ErrorState
          title="حدث خطأ في تحميل سجل التدقيق"
          message={getErrorMessage(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">سجل التدقيق بالنظام</h1>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold">
              Super Admin Only
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-sm">مراقبة الأحداث الأمنية وتتبع العمليات المنفذة في النظام بشكل كامل وغير قابل للتعديل.</p>
        </div>
        <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-3">
          <span className="material-symbols-outlined text-purple-600">history_toggle_off</span>
          <span className="text-sm font-bold text-slate-700">إجمالي الأحداث: {pagination.total}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Action Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">العملية (Action)</label>
            <input
              type="text"
              placeholder="مثال: USER_CREATED"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
            />
          </div>

          {/* Entity Type Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">نوع الكيان (Entity)</label>
            <select
              value={entityTypeFilter}
              onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
            >
              <option value="">الكل (All Entities)</option>
              <option value="User">مستخدم (User)</option>
              <option value="Vehicle">مركبة (Vehicle)</option>
              <option value="Appointment">موعد (Appointment)</option>
              <option value="InventoryPart">قطعة مخزون (InventoryPart)</option>
              <option value="RequiredPart">طلب قطع (RequiredPart)</option>
              <option value="Invoice">فاتورة (Invoice)</option>
              <option value="Review">تقييم (Review)</option>
            </select>
          </div>

          {/* Actor User ID Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">معرف المنفذ (Actor ID)</label>
            <input
              type="text"
              placeholder="معرف المستخدم..."
              value={actorUserIdFilter}
              onChange={(e) => { setActorUserIdFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
            />
          </div>

          {/* From Date Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">من تاريخ</label>
            <input
              type="date"
              value={fromDateFilter}
              onChange={(e) => { setFromDateFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
            />
          </div>

          {/* To Date Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={toDateFilter}
              onChange={(e) => { setToDateFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
            />
          </div>
        </div>

        {(actionFilter || entityTypeFilter || actorUserIdFilter || fromDateFilter || toDateFilter) && (
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              <span>إعادة ضبط الفلاتر</span>
            </button>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      {isLoading ? (
        <PageLoader />
      ) : (
        <div className={`bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-opacity duration-300 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {auditLogs.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <span className="material-symbols-outlined text-5xl">manage_search</span>
              <p className="font-bold">لا توجد سجلات تدقيق مطابقة للفلاتر الحالية.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">التاريخ والوقت</th>
                    <th className="py-4 px-6">المنفذ (Actor)</th>
                    <th className="py-4 px-6">العملية (Action)</th>
                    <th className="py-4 px-6">الكيان (Entity)</th>
                    <th className="py-4 px-6">رقم الكيان (ID)</th>
                    <th className="py-4 px-6 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {auditLogs.map((log) => {
                    const actionInfo = actionMap[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-700 border-slate-200' };
                    const actorName = log.actor ? log.actor.name : (log.actor_user_id ? `مستخدم #${log.actor_user_id}` : 'النظام');
                    const actorEmail = log.actor?.email || '';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Date / Time */}
                        <td className="py-4 px-6 text-xs font-mono font-medium text-slate-600">
                          {formatDateTime(log.created_at)}
                        </td>

                        {/* Actor */}
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{actorName}</p>
                            {actorEmail && <p className="text-[11px] text-slate-400 font-mono">{actorEmail}</p>}
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <span className={`inline-block px-3 py-1 rounded-full border text-xs font-bold ${actionInfo.color}`}>
                              {actionInfo.label}
                            </span>
                            <p className="text-[10px] font-mono text-slate-400 block">{log.action}</p>
                          </div>
                        </td>

                        {/* Entity Type */}
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                            {log.entity_type || '-'}
                          </span>
                        </td>

                        {/* Entity ID */}
                        <td className="py-4 px-6 text-xs font-mono text-slate-500">
                          {log.entity_id || '-'}
                        </td>

                        {/* View Details Button */}
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span>التفاصيل</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-bold">
                الصفحة {pagination.page} من {pagination.totalPages} (إجمالي {pagination.total} سجل)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1 || isFetching}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  السابقة
                </button>
                <span className="text-xs font-bold text-slate-700 px-2">{pagination.page}</span>
                <button
                  disabled={pagination.page >= pagination.totalPages || isFetching}
                  onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  التالية
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-purple-600 text-2xl">receipt_long</span>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">تفاصيل حدث التدقيق</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedLog.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 text-xs">
              
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">العملية:</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">المنفذ (Actor):</span>
                  <span className="font-bold text-slate-800">{selectedLog.actor ? `${selectedLog.actor.name} (${selectedLog.actor.role})` : (selectedLog.actor_user_id || 'نظام')}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">التاريخ والوقت:</span>
                  <span className="font-bold text-slate-800 font-mono">{formatDateTime(selectedLog.created_at)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">نوع الكيان (Entity):</span>
                  <span className="font-bold text-slate-800">{selectedLog.entity_type || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">رقم الكيان (Entity ID):</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedLog.entity_id || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">عنوان IP:</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedLog.ip_address || 'غير متوفر'}</span>
                </div>
              </div>

              {/* User Agent */}
              {selectedLog.user_agent && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-bold block mb-1">متصفح المستخدم (User Agent):</span>
                  <p className="font-mono text-[11px] text-slate-600 break-all">{selectedLog.user_agent}</p>
                </div>
              )}

              {/* Old vs New Values JSON comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Old Values */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">القيم القديمة (Old Values):</span>
                  <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto dir-ltr text-left max-h-60 custom-scrollbar">
                    {selectedLog.old_values ? (
                      <pre>{JSON.stringify(selectedLog.old_values, null, 2)}</pre>
                    ) : (
                      <span className="text-slate-500 italic">null (لا توجد تغييرات حاسمة)</span>
                    )}
                  </div>
                </div>

                {/* New Values */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">القيم الجديدة (New Values):</span>
                  <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto dir-ltr text-left max-h-60 custom-scrollbar">
                    {selectedLog.new_values ? (
                      <pre>{JSON.stringify(selectedLog.new_values, null, 2)}</pre>
                    ) : (
                      <span className="text-slate-500 italic">null</span>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
