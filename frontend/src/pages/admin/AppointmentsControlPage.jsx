import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { appointmentsAPI, usersAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import AppointmentDetailsModal from '../../components/admin/AppointmentDetailsModal';
import toast from 'react-hot-toast';

export default function AppointmentsControlPage() {
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

  const { data: appointments = [], isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['appointments', debouncedSearch],
    queryFn: () => appointmentsAPI.getAll(debouncedSearch),
    placeholderData: keepPreviousData
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getAll
  });

  const mechanics = allUsers.filter(u => u.role === 'mechanic');

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }) => appointmentsAPI.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });

  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedMechanics, setSelectedMechanics] = useState({});
  const [activeFilter, setActiveFilter] = useState('pending');
  const [detailsModalAppId, setDetailsModalAppId] = useState(null);

  const columns = [
    { id: 'pending', label: 'بانتظار التأكيد', color: 'bg-slate-100 text-slate-700' },
    { id: 'awaiting_assignment', label: 'بانتظار التعيين', color: 'bg-amber-100 text-amber-800' },
    { id: 'in_progress', label: 'قيد الإصلاح', color: 'bg-indigo-100 text-indigo-800' },
    { id: 'completed', label: 'مكتمل', color: 'bg-emerald-100 text-emerald-800' },
  ];

  const handleAction = (app) => {
    if (app.status === 'pending') {
      updateStatusMutation.mutate({ id: app.id, data: { status: 'awaiting_assignment' } });
    }
  };

  const handleInlineAssign = (app) => {
    const mechId = selectedMechanics[app.id];
    if (!mechId) return;
    
    const mechanicIds = Array.isArray(mechId) ? mechId.map(id => parseInt(id, 10)) : [parseInt(mechId, 10)];

    // We update to under_inspection so the mechanic first sees "تقرير الفحص" (Waiting for Inspection).
    updateStatusMutation.mutate(
      { id: app.id, data: { status: 'under_inspection', mechanic_ids: mechanicIds } },
      {
        onSuccess: () => {
          setSelectedMechanics(prev => {
            const newState = { ...prev };
            delete newState[app.id];
            return newState;
          });
        }
      }
    );
  };

  if (isError) {
    return (
      <div className="py-8">
        <ErrorState
          title="حدث خطأ في تحميل جدول المواعيد"
          message={getErrorMessage(error)}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['appointments'] })}
        />
      </div>
    );
  }

  const filteredAppointments = appointments.filter(a => a.status === activeFilter || (activeFilter === 'in_progress' && ['under_inspection', 'waiting_parts'].includes(a.status)));

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-500">
      
      {/* Row 1: Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">إدارة المواعيد</h1>
          <p className="text-slate-500 mt-2 text-sm">تتبع وإدارة المواعيد بحسب حالتها الحالية.</p>
        </div>
      </div>
      
      {/* Row 2: Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative w-full md:w-80 shrink-0">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input 
            type="text" 
            placeholder="ابحث بالعميل، الجوال، أو اللوحة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
          />
        </div>

        {/* Filter Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex gap-1 overflow-x-auto custom-scrollbar w-full md:w-max">
          {columns.map(col => {
            const count = appointments.filter(a => a.status === col.id || (col.id === 'in_progress' && ['under_inspection', 'waiting_parts'].includes(a.status))).length;
            const isActive = activeFilter === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveFilter(col.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {col.label}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-bold animate-pulse">جاري تحميل المواعيد...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            icon="event_busy"
            title="لا توجد مواعيد في هذا القسم"
            message={searchTerm ? "لم يتم العثور على أي مواعيد تطابق بحثك الحالي." : "لا توجد مواعيد مدرجة ضمن هذا التصنيف حالياً."}
          />
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {filteredAppointments.map(app => {
              const [carName, carPlate] = (app.car || '').split(' - ');
              return (
                <div key={app.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-md">
                      {app.id}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-4">
                    {/* Header: Car Info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg leading-tight">{carName}</h4>
                        {carPlate && <p className="text-xs font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider">{carPlate}</p>}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/50 shadow-sm shadow-slate-100">
                        <span className="material-symbols-outlined text-slate-400 text-xl">directions_car</span>
                      </div>
                    </div>
                    
                    {/* Key Details Rows */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100/50">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                          <span className="text-xs font-bold text-slate-500">العميل</span>
                        </div>
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{app.clientName}</span>
                      </div>
                      
                      {app.status === 'pending' && (
                        <div className="flex items-center justify-between bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100/50">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-slate-400">event</span>
                            <span className="text-xs font-bold text-slate-500">الموعد</span>
                          </div>
                          <span className="text-sm font-bold text-primary" dir="ltr">{app.date} | {app.time}</span>
                        </div>
                      )}

                      {app.status === 'completed' && (
                        <div className="flex items-center justify-between bg-emerald-50 px-3 py-2.5 rounded-xl border border-emerald-100/50">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-emerald-500">done_all</span>
                            <span className="text-xs font-bold text-emerald-600">الانتهاء</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-700" dir="ltr">{app.date}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Complaint/Issue */}
                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100/50">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">build</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">الشكوى / الطلب</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed line-clamp-3">{app.issue}</p>
                    </div>
                    
                    {/* Assigned Mechanic / Mechanics */}
                    {(app.status === 'in_progress' || app.status === 'under_inspection' || app.status === 'waiting_parts' || app.status === 'completed') && (app.mechanic_id || (app.mechanics && app.mechanics.length > 0)) && (
                      <div className="bg-indigo-50/50 rounded-xl p-3 flex flex-col gap-2 border border-indigo-100/50">
                        <span className="text-[10px] text-indigo-400 font-bold block mb-0.5">الفنيون المكلفون</span>
                        {Array.isArray(app.mechanics) && app.mechanics.length > 0 ? (
                          app.mechanics.map(m => (
                            <div key={m.id} className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                {m.name?.charAt(0) || 'م'}
                              </div>
                              <span className="text-xs text-indigo-700 font-bold">{m.name}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                              {mechanics.find(m => m.id == app.mechanic_id)?.name?.charAt(0) || 'م'}
                            </div>
                            <span className="text-sm text-indigo-700 font-bold">
                              {mechanics.find(m => m.id == app.mechanic_id)?.name || 'فني'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline Mechanic Assignment */}
                    {app.status === 'awaiting_assignment' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">اختر الفني للمهمة</label>
                        <div className="relative">
                          <select 
                            value={selectedMechanics[app.id] || ''}
                            onChange={(e) => setSelectedMechanics(prev => ({...prev, [app.id]: e.target.value}))}
                            className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none font-bold text-slate-700 transition-all"
                          >
                            <option value="">-- اختر من القائمة --</option>
                            {mechanics.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">arrow_drop_down</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Container */}
                  <div className="mt-5 pt-4 border-t border-slate-50">
                    {app.status === 'pending' && (
                      <button
                        onClick={() => handleAction(app)}
                        disabled={updateStatusMutation.isPending}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20"
                      >
                        تأكيد الموعد
                      </button>
                    )}

                    {app.status === 'awaiting_assignment' && (
                      <button
                        onClick={() => handleInlineAssign(app)}
                        disabled={updateStatusMutation.isPending || !selectedMechanics[app.id]}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                      >
                        إسناد للميكانيكي
                      </button>
                    )}

                    {(app.status === 'in_progress' || app.status === 'under_inspection' || app.status === 'waiting_parts') && (
                      <button
                        onClick={() => setDetailsModalAppId(app.id)}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                      >
                        عرض التفاصيل
                      </button>
                    )}

                    {app.status === 'completed' && (
                      <div className="flex justify-between items-center gap-2">
                        <button
                          onClick={() => setDetailsModalAppId(app.id)}
                          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] bg-teal-50 text-teal-700 hover:bg-teal-100 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">description</span>
                          عرض التقرير
                        </button>
                        <button
                          onClick={() => navigate('/admin/financials')}
                          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] bg-teal-700 text-white hover:bg-teal-800 shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
                        >
                          إنهاء وفوترة
                          <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {detailsModalAppId && (
        <AppointmentDetailsModal 
          appointmentId={detailsModalAppId} 
          onClose={() => setDetailsModalAppId(null)} 
        />
      )}

    </div>
  );
}
