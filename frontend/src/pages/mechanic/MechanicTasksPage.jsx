import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mechanicAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import DiagnosisModal from '../../components/mechanic/DiagnosisModal';
import PartsRequestDrawer from '../../components/mechanic/PartsRequestDrawer';
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
    badge: 'bg-blue-50 text-blue-600',
  },
  waiting_parts: {
    label: 'بانتظار قطع',
    badge: 'bg-amber-50 text-amber-700',
  },
  in_progress: {
    label: 'جاري الإصلاح',
    badge: 'bg-indigo-50 text-indigo-600',
  },
  completed: {
    label: 'مكتمل',
    badge: 'bg-teal-50 text-teal-600',
  },
};

export default function MechanicTasksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false);
  const [selectedTaskForParts, setSelectedTaskForParts] = useState(null);
  
  // State for Diagnosis Drawer
  const [isDiagnosisDrawerOpen, setIsDiagnosisDrawerOpen] = useState(false);
  const [selectedTaskForDiagnosis, setSelectedTaskForDiagnosis] = useState(null);

  // State for Parts Request Drawer
  const [isPartsRequestDrawerOpen, setIsPartsRequestDrawerOpen] = useState(false);
  const [selectedTaskForPartsRequest, setSelectedTaskForPartsRequest] = useState(null);

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
          { id: 'in_progress', label: 'جاري الإصلاح' },
          { id: 'waiting_parts', label: 'بانتظار قطع' },
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
          const isCompleted = task.status === 'completed';
          // Post-diagnosis = still under_inspection but report already submitted
          const postDiagnosis = isUnder && task.hasReport;

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

              {/* Client Issue */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-5 flex-1 border border-slate-100/50 min-h-[80px]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1.5">
                  <span className="material-symbols-outlined text-[15px]">report_problem</span>
                  شكوى العميل
                </div>
                <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{task.clientIssue}</p>
              </div>

                {/* Requested Parts Status (If Any) */}
                {task.requestedParts && task.requestedParts.length > 0 && (
                  <div className="mb-5">
                    <button
                      onClick={() => {
                        setSelectedTaskForParts(task);
                        setIsPartsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100/50"
                    >
                      <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                      عرض حالة القطع ({task.requestedParts.length})
                    </button>
                  </div>
                )}

                {/* Footer with date and action */}
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

                  {/* ── STATE 2: DIAGNOSIS (PRE-REPORT) ── */}
                  {isUnder && !task.hasReport && (
                    <button
                      onClick={() => {
                        setSelectedTaskForDiagnosis(task);
                        setIsDiagnosisDrawerOpen(true);
                      }}
                      className="w-full bg-blue-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">plumbing</span>
                      إضافة تقرير الأعطال
                    </button>
                  )}

                  {/* ── STATE 3: DECISION (POST-REPORT) ── */}
                  {isUnder && task.hasReport && (
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
                          setIsPartsRequestDrawerOpen(true);
                        }}
                        className="flex-1 bg-amber-50 text-amber-700 py-3 rounded-2xl text-xs font-bold hover:bg-amber-100 transition-all border border-amber-100 flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                        طلب قطع غيار
                      </button>
                    </div>
                  )}

                  {/* ── STATE 4: EXECUTION (IN PROGRESS) ── */}
                  {isInProgress && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => statusMutation.mutate({ id: task.appointment_id, status: 'completed' })}
                        disabled={statusMutation.isPending}
                        className="flex-1 bg-teal-600 text-white py-3 rounded-2xl text-xs font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-1 disabled:opacity-60 shadow-sm"
                      >
                        {statusMutation.isPending ? (
                          <span className="material-symbols-outlined animate-spin text-[15px]">sync</span>
                        ) : (
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        )}
                        إكمال العمل
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTaskForPartsRequest(task);
                          setIsPartsRequestDrawerOpen(true);
                        }}
                        className="flex-1 bg-amber-50 text-amber-700 py-3 rounded-2xl text-xs font-bold hover:bg-amber-100 transition-all border border-amber-100 flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                        طلب قطع غيار
                      </button>
                    </div>
                  )}

                  {/* ── STATE 5: WAITING FOR PARTS ── */}
                  {isWaiting && (
                    <button
                      onClick={() => statusMutation.mutate({ id: task.appointment_id, status: 'in_progress' })}
                      disabled={statusMutation.isPending}
                      className="w-full bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
                    >
                      {statusMutation.isPending ? (
                        <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      )}
                      متابعة العمل
                    </button>
                  )}

                  {/* ── STATE 6: DELIVERY (COMPLETED) ── */}
                  {isCompleted && (
                    <div className="w-full flex items-center justify-center gap-2 bg-teal-50 text-teal-600 py-3 rounded-2xl text-sm font-bold border border-teal-100 cursor-default opacity-80">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      العمل مكتمل
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

      {/* Parts List Modal */}
      {isPartsModalOpen && selectedTaskForParts && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          {/* Blurred Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => {
              setIsPartsModalOpen(false);
              setSelectedTaskForParts(null);
            }}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">تفاصيل قطع الغيار</h2>
                  <p className="text-xs font-mono font-bold text-slate-400 mt-0.5">{selectedTaskForParts.vehicle} - {selectedTaskForParts.plate}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsPartsModalOpen(false);
                  setSelectedTaskForParts(null);
                }} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
              {selectedTaskForParts.requestedParts.map(part => (
                <div key={part.id} className="flex justify-between items-center text-sm p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">{part.name}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>الكمية: {part.quantity}</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(part.price)}</span>
                    </div>
                  </div>
                  <div>
                    {part.status === 'approved' ? (
                      <span className="text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl font-bold shrink-0">موافق</span>
                    ) : part.status === 'rejected' ? (
                      <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl font-bold shrink-0">مرفوض</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        بانتظار العميل
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Total Amount */}
              {(() => {
                const totalCost = selectedTaskForParts.requestedParts.reduce((sum, part) => {
                  return sum + (part.quantity * Number(part.price || 0));
                }, 0);
                
                return (
                  <div className="flex justify-between items-center pt-4 px-2 border-t border-slate-100 mt-4">
                    <span className="font-bold text-slate-700">التكلفة الإجمالية للقطع:</span>
                    <span className="text-xl font-bold text-emerald-600">{formatCurrency(totalCost)}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Diagnosis Modal Overlay */}
      {isDiagnosisDrawerOpen && selectedTaskForDiagnosis && (
        <DiagnosisModal
          task={selectedTaskForDiagnosis}
          onClose={() => {
            setIsDiagnosisDrawerOpen(false);
            setSelectedTaskForDiagnosis(null);
          }}
        />
      )}

      {/* Parts Request Drawer Overlay */}
      {isPartsRequestDrawerOpen && selectedTaskForPartsRequest && (
        <PartsRequestDrawer
          task={selectedTaskForPartsRequest}
          onClose={() => {
            setIsPartsRequestDrawerOpen(false);
            setSelectedTaskForPartsRequest(null);
          }}
        />
      )}

    </>
  );
}
