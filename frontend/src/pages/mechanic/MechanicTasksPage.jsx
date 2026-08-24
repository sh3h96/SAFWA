import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mechanicAPI, requiredPartsAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import DiagnosisModal from '../../components/mechanic/DiagnosisModal';
import PartsRequestModal from '../../components/mechanic/PartsRequestModal';
import TechnicalReportViewModal from '../../components/mechanic/TechnicalReportViewModal';
import { formatDate, formatDateLong, formatTime, formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

// ─── Status Configuration ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    label: 'قيد الانتظار',
    badge: 'bg-slate-100 text-slate-600',
  },
  under_inspection: {
    label: 'تحت الفحص',
    badge: 'bg-blue-50 text-blue-600 border border-blue-100',
  },
  waiting_parts: {
    label: 'بانتظار القطع',
    badge: 'bg-amber-50 text-amber-700 border border-amber-100',
  },
  in_progress: {
    label: 'جاري الإصلاح',
    badge: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  },
  ready_for_pickup: {
    label: 'جاهز للتسليم',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  },
  completed: {
    label: 'مكتمل',
    badge: 'bg-teal-50 text-teal-600 border border-teal-100',
  },
  cancelled: {
    label: 'ملغاة / متوقفة',
    badge: 'bg-rose-50 text-rose-700 border border-rose-100',
  },
};

export default function MechanicTasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Modals state
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false);
  const [selectedTaskForPartsView, setSelectedTaskForPartsView] = useState(null);
  
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [selectedTaskForDiagnosis, setSelectedTaskForDiagnosis] = useState(null);

  const [isPartsRequestModalOpen, setIsPartsRequestModalOpen] = useState(false);
  const [selectedTaskForPartsRequest, setSelectedTaskForPartsRequest] = useState(null);

  const [isReportViewModalOpen, setIsReportViewModalOpen] = useState(false);
  const [selectedTaskForReportView, setSelectedTaskForReportView] = useState(null);

  const [editingPartId, setEditingPartId] = useState(null);
  const [editingPartQty, setEditingPartQty] = useState('');

  // Filter State
  const [activeFilter, setActiveFilter] = useState('active');

  const { data: tasks = [], isLoading, isError, error } = useQuery({
    queryKey: ['mechanic', 'tasks'],
    queryFn: mechanicAPI.getTasks,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => mechanicAPI.updateAppointmentStatus(id, status),
    onSuccess: () => {
      toast.success('تم تغيير حالة المهمة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'tasks'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء تغيير حالة المهمة'));
    }
  });

  const installPartMutation = useMutation({
    mutationFn: (partId) => requiredPartsAPI.installPart(partId),
    onSuccess: (res) => {
      toast.success(res.message || 'تم تركيب القطعة بالمركبة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'tasks'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء تركيب القطعة'));
    }
  });

  const updatePartQtyMutation = useMutation({
    mutationFn: ({ partId, quantity }) => requiredPartsAPI.updateRequest(partId, quantity),
    onSuccess: (res) => {
      toast.success(res.message || 'تم تحديث كمية الطلب بنجاح');
      setEditingPartId(null);
      setEditingPartQty('');
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'tasks'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء تحديث كمية الطلب'));
    }
  });

  const cancelPartMutation = useMutation({
    mutationFn: (partId) => requiredPartsAPI.cancelRequest(partId),
    onSuccess: (res) => {
      toast.success(res.message || 'تم إلغاء طلب قطعة الغيار بنجاح');
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'tasks'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء إلغاء طلب القطعة'));
    }
  });

  if (isLoading) return <PageLoader />;

  if (isError) return (
    <div className="py-8">
      <ErrorState
        title="حدث خطأ في تحميل جدول العمل"
        message={getErrorMessage(error)}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['mechanic', 'tasks'] })}
      />
    </div>
  );

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">جدول العمل اليومي</h1>
          <p className="text-slate-500 mt-1 text-sm">المركبات المخصصة لك لفحصها وصيانتها.</p>
        </div>
        <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">calendar_today</span>
          <span className="text-sm font-bold text-slate-700">{formatDateLong(new Date())}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
        {[
          { id: 'active', label: 'المهام الحالية' },
          { id: 'under_inspection', label: 'تحت الفحص' },
          { id: 'waiting_parts', label: 'بانتظار قطع' },
          { id: 'in_progress', label: 'جاري الإصلاح' },
          { id: 'ready_for_pickup', label: 'جاهز للتسليم' },
          { id: 'completed', label: 'مكتمل' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeFilter === filter.id 
                ? 'bg-teal-600 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {(() => {
        const filteredTasks = tasks.filter(task => {
          if (activeFilter === 'active') {
            return ['pending', 'under_inspection', 'in_progress', 'waiting_parts'].includes(task.status);
          }
          return task.status === activeFilter;
        });

        return (
          <>
            {/* Empty state */}
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-slate-300">check_circle</span>
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد مهام مطابقة</h3>
                <p className="text-slate-500 text-sm">ليس لديك مهام في هذا التصنيف حالياً.</p>
              </div>
            )}

            {/* Task Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.map((task) => {
          const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
          const isPending = task.status === 'pending';
          const isUnder = task.status === 'under_inspection';
          const isWaiting = task.status === 'waiting_parts';
          const isInProgress = task.status === 'in_progress';
          const isReady = task.status === 'ready_for_pickup';
          const isCompleted = task.status === 'completed';
          const isCancelled = task.status === 'cancelled';

          const isInspectionDone = task.isInspectionComplete;

          return (
            <div
              key={task.id}
              className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined">directions_car</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{task.vehicle}</h3>
                    <p className="text-xs font-mono font-bold text-slate-400 mt-0.5 uppercase">{task.plate}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-xl ${cfg.badge}`}>
                  {cfg.label}
                </span>
              </div>

              {/* Rework Alert Banner */}
              {(task.rework_notes || (task.rework_history && task.rework_history.length > 0)) && (
                <div className="mb-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 space-y-1 text-amber-900">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <span className="material-symbols-outlined text-amber-600 text-base">replay</span>
                    <span>توجيهات إعادة الإصلاح من الإدارة:</span>
                  </div>
                  <p className="text-xs font-bold leading-relaxed">
                    {task.rework_notes || task.rework_history[task.rework_history.length - 1]?.admin_notes}
                  </p>
                </div>
              )}

              {/* Client Issue */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-4 flex-1 border border-slate-100/50 min-h-[70px]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                  <span className="material-symbols-outlined text-[15px]">report_problem</span>
                  شكوى العميل
                </div>
                <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{task.clientIssue}</p>
              </div>

              {/* Technical Inspection Status Summary */}
              <div className="mb-4">
                {isInspectionDone ? (
                  <button
                    onClick={() => {
                      setSelectedTaskForReportView(task);
                      setIsReportViewModalOpen(true);
                    }}
                    className="w-full text-right px-3 py-2 bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-200 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold flex items-center justify-between transition-colors shadow-2xs group"
                    title="انقر لعرض تفاصيل تقرير الفحص الفني المكتمل"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                      <span>الفحص الفني مكتمل ({formatCurrency(task.reportDetails?.estimated_labor_cost || 0)} أجور عمل)</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 group-hover:translate-x-[-2px] transition-transform">visibility</span>
                  </button>
                ) : (
                  <div className="px-3 py-2 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-600">pending</span>
                    <span>الفحص الفني بانتظار الإكمال</span>
                  </div>
                )}
              </div>

              {/* Requested Parts List & Actions */}
              {task.requestedParts && task.requestedParts.length > 0 && (
                <div className="mb-5 bg-slate-50/70 p-3 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">inventory_2</span>
                      قطع الغيار المطلوبة ({task.requestedParts.length})
                    </span>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                    {task.requestedParts.map(part => {
                      const isPendingPart = part.status === 'pending';
                      const isApprovedPart = part.status === 'approved';
                      const isInstalledPart = part.status === 'installed';
                      const isRejectedPart = part.status === 'rejected';

                      return (
                        <div key={part.id} className="bg-white p-2.5 rounded-xl border border-slate-100 text-xs flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 truncate">{part.name}</span>
                            <span className="font-mono text-slate-500">الكمية: <strong>{part.quantity}</strong></span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            {/* Part Status Badge */}
                            {isPendingPart && (
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                بانتظار موافقة الإدارة
                              </span>
                            )}
                            {isApprovedPart && (
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                معتمد - جاهز للتركيب
                              </span>
                            )}
                            {isInstalledPart && (
                              <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">build</span>
                                تم تركيب القطعة
                              </span>
                            )}
                            {isRejectedPart && (
                              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">cancel</span>
                                مرفوض
                              </span>
                            )}

                            {/* Mechanic Action for Part */}
                            <div className="flex items-center gap-1">
                              {/* Mechanic Install Button */}
                              {isApprovedPart && (
                                <button
                                  onClick={() => installPartMutation.mutate(part.id)}
                                  disabled={installPartMutation.isPending}
                                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                                  title="تأكيد تركيب هذه القطعة بالمركبة"
                                >
                                  {installPartMutation.isPending && installPartMutation.variables === part.id ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <span className="material-symbols-outlined text-[13px]">build</span>
                                  )}
                                  <span>تركيب القطعة</span>
                                </button>
                              )}

                              {/* Mechanic Cancel Pending Part */}
                              {isPendingPart && (
                                <button
                                  onClick={() => cancelPartMutation.mutate(part.id)}
                                  disabled={cancelPartMutation.isPending}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold transition-all"
                                  title="إلغاء هذا الطلب المعلق"
                                >
                                  إلغاء
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer with date and actions according to business rules */}
              <div className="border-t border-slate-50 pt-4 space-y-3">
                <div className="flex justify-between text-xs text-slate-400 font-bold">
                  <span>{formatDate(task.date)}</span>
                  <span className="font-mono">{formatTime(task.timeAssigned)}</span>
                </div>

                {/* ── STATE 1: PENDING ── */}
                {isPending && (
                  <button
                    onClick={() => statusMutation.mutate({ id: task.appointment_id, status: 'under_inspection' })}
                    disabled={statusMutation.isPending}
                    className="w-full bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {statusMutation.isPending ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">search</span>
                    )}
                    بدء الفحص
                  </button>
                )}

                {/* ── STATE 2: UNDER INSPECTION ── */}
                {isUnder && (
                  <div className="space-y-2">
                    {!isInspectionDone ? (
                      <button
                        onClick={() => {
                          setSelectedTaskForDiagnosis(task);
                          setIsDiagnosisModalOpen(true);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">plumbing</span>
                        إكمال الفحص الفني
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => statusMutation.mutate({ id: task.appointment_id, status: 'in_progress' })}
                          disabled={statusMutation.isPending}
                          className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[15px]">build</span>
                          بدء الإصلاح
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTaskForPartsRequest(task);
                            setIsPartsRequestModalOpen(true);
                          }}
                          className="flex-1 bg-amber-50 text-amber-800 py-3 rounded-2xl text-xs font-bold hover:bg-amber-100 transition-all border border-amber-200 flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                          طلب قطعة غيار
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STATE 3: WAITING PARTS ── */}
                {isWaiting && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => statusMutation.mutate({ id: task.appointment_id, status: 'in_progress' })}
                      disabled={statusMutation.isPending}
                      className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm"
                    >
                      {statusMutation.isPending ? (
                        <span className="material-symbols-outlined animate-spin text-[15px]">sync</span>
                      ) : (
                        <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                      )}
                      متابعة العمل
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTaskForPartsRequest(task);
                        setIsPartsRequestModalOpen(true);
                      }}
                      className="flex-1 bg-amber-50 text-amber-800 py-3 rounded-2xl text-xs font-bold hover:bg-amber-100 transition-all border border-amber-200 flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">add_shopping_cart</span>
                      طلب قطعة إضافية
                    </button>
                  </div>
                )}

                {/* ── STATE 4: IN PROGRESS ── */}
                {isInProgress && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => statusMutation.mutate({ id: task.appointment_id, status: 'ready_for_pickup' })}
                      disabled={statusMutation.isPending}
                      className="flex-1 bg-teal-600 text-white py-3 rounded-2xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm"
                    >
                      {statusMutation.isPending ? (
                        <span className="material-symbols-outlined animate-spin text-[15px]">sync</span>
                      ) : (
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      )}
                      إكمال الإصلاح
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTaskForPartsRequest(task);
                        setIsPartsRequestModalOpen(true);
                      }}
                      className="flex-1 bg-amber-50 text-amber-800 py-3 rounded-2xl text-xs font-bold hover:bg-amber-100 transition-all border border-amber-200 flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                      طلب قطعة إضافية
                    </button>
                  </div>
                )}

                {/* ── STATE 5: READY FOR PICKUP ── */}
                {isReady && (
                  <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 py-3 rounded-2xl text-xs font-bold border border-emerald-200 cursor-default">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">key</span>
                    <span>جاهز للتسليم — بانتظار العميل</span>
                  </div>
                )}

                {/* ── STATE 6: COMPLETED ── */}
                {isCompleted && (
                  <div className="w-full flex items-center justify-center gap-2 bg-teal-50 text-teal-700 py-3 rounded-2xl text-xs font-bold border border-teal-100 cursor-default">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>تم تسليم المركبة والعمل مكتمل</span>
                  </div>
                )}

                {/* ── STATE 7: CANCELLED ── */}
                {isCancelled && (
                  <div className="w-full p-3 bg-rose-50 text-rose-800 rounded-2xl text-xs font-bold border border-rose-200 text-right">
                    <span className="block text-[10px] text-rose-600 font-bold mb-0.5">عملية ملغاة / متوقفة</span>
                    <p className="text-xs">{task.cancellation_reason || 'تم إيقاف العمل بناءً على توجيهات الإدارة'}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
            </div>
          </>
        );
      })()}
      </div>

      {/* Diagnosis Modal Overlay */}
      {isDiagnosisModalOpen && selectedTaskForDiagnosis && (
        <DiagnosisModal
          task={selectedTaskForDiagnosis}
          onClose={() => {
            setIsDiagnosisModalOpen(false);
            setSelectedTaskForDiagnosis(null);
          }}
        />
      )}

      {/* Parts Request Modal Overlay (Centered Modal Dialog) */}
      {isPartsRequestModalOpen && selectedTaskForPartsRequest && (
        <PartsRequestModal
          appointmentId={selectedTaskForPartsRequest.appointment_id || selectedTaskForPartsRequest.id}
          onClose={() => {
            setIsPartsRequestModalOpen(false);
            setSelectedTaskForPartsRequest(null);
          }}
        />
      )}

      {/* Read-Only Technical Report View Modal */}
      {isReportViewModalOpen && selectedTaskForReportView && (
        <TechnicalReportViewModal
          task={selectedTaskForReportView}
          onClose={() => {
            setIsReportViewModalOpen(false);
            setSelectedTaskForReportView(null);
          }}
        />
      )}

    </>
  );
}
