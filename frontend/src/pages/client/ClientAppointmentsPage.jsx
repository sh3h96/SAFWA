import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import PartsApproval from '../../components/client/PartsApproval';
import { formatDate } from '../../utils/formatters';

export default function ClientAppointmentsPage() {
  const { data: appointmentsRaw = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['client', 'appointments'],
    queryFn: clientAPI.getMyAppointments
  });

  const [filter, setFilter] = useState('active');

  const allAppointments = appointmentsRaw.map(app => {
    // Attempt to extract service from description if we saved it as [الخدمة: X]
    let service = 'صيانة دورية';
    if (app.description && app.description.includes('[الخدمة:')) {
      const match = app.description.match(/\[الخدمة: (.*?)\]/);
      if (match) service = match[1];
    } else if (app.description) {
      service = app.description;
    }

    return {
      id: `APP-${app.id}`,
      vehicle: `${app.vehicleMake} ${app.vehicleModel} (${app.plateNumber})`,
      date: app.date,
      service,
      status: app.status || 'pending',
      requestedParts: app.requestedParts || [],
    };
  });

  const appointments = allAppointments.filter(app => {
    if (filter === 'completed') return app.status === 'completed';
    if (filter === 'active') return app.status !== 'completed' && app.status !== 'cancelled';
    return true; // for 'all'
  });

  if (isLoading) return <PageLoader />;

  if (isError) return (
    <div className="py-8">
      <ErrorState
        title="حدث خطأ في تحميل سجل المواعيد"
        message={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">سجل المواعيد</h1>
          <p className="text-slate-500 mt-2 text-sm">تابع حالة سيارتك خطوة بخطوة أثناء تواجدها في الورشة.</p>
        </div>
        
        <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex gap-1 self-stretch sm:self-auto overflow-x-auto">
          <button
            onClick={() => setFilter('active')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === 'active' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            جاري الإصلاح
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === 'completed' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            مكتمل
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === 'all' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            الكل
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {appointments.length === 0 ? (
          <EmptyState
            icon="event_busy"
            title="لا توجد مواعيد"
            message="لم يتم العثور على أي مواعيد في هذا التصنيف حالياً."
          />
        ) : (
          appointments.map((app) => {
            const needsPartsStage = app.status === 'waiting_parts' || (app.requestedParts && app.requestedParts.length > 0);

            const stages = [
              { id: 'pending', label: 'قيد الانتظار', icon: 'schedule' },
              { id: 'under_inspection', label: 'تحت الفحص', icon: 'plumbing' }
            ];

            if (needsPartsStage) {
              stages.push({ id: 'waiting_parts', label: 'بانتظار قطع', icon: 'inventory_2' });
            }

            stages.push(
              { id: 'in_progress', label: 'جاري الإصلاح', icon: 'build' },
              { id: 'ready_for_pickup', label: 'جاهز للاستلام', icon: 'mark_email_read' },
              { id: 'completed', label: 'مكتمل', icon: 'check_circle' }
            );

            const getStageIndex = (status) => {
              if (status === 'completed') return stages.length - 1;
              if (status === 'ready_for_pickup' || status === 'ready') return stages.findIndex(s => s.id === 'ready_for_pickup');
              if (status === 'in_progress' || status === 'repairing') return stages.findIndex(s => s.id === 'in_progress');
              if (needsPartsStage && status === 'waiting_parts') return stages.findIndex(s => s.id === 'waiting_parts'); 
              if (status === 'under_inspection' || status === 'inspection') return stages.findIndex(s => s.id === 'under_inspection'); 
              return 0; // pending or confirmed fallback
            };

            let currentStageIdx = getStageIndex(app.status);
            if (currentStageIdx === -1) currentStageIdx = 0; // fallback to pending
            
            const isCompleted = status === 'completed';

            return (
              <div 
                key={app.id} 
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              >
                {/* Header Info */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-50 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined">car_repair</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{app.vehicle}</h3>
                      <p className="text-sm text-slate-500 line-clamp-1">{app.service}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">رقم الطلب</p>
                    <p className="font-mono font-bold text-slate-700">{app.id}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">{formatDate(app.date)}</p>
                  </div>
                </div>

                {/* Pipeline Tracker */}
                <div className="relative flex justify-between items-center w-full max-w-3xl mx-auto mt-4">
                  {/* Connecting Line Background */}
                  <div className="absolute top-6 left-0 right-0 h-1 bg-slate-100 rounded-full z-0 transform -translate-y-1/2 mx-8"></div>
                  
                  {/* Connecting Line Active */}
                  <div 
                    className="absolute top-6 right-0 h-1 bg-primary rounded-full z-0 transform -translate-y-1/2 mx-8 transition-all duration-700 ease-in-out"
                    style={{ width: `calc(${(currentStageIdx / (stages.length - 1)) * 100}% - 4rem)` }}
                  ></div>

                  {stages.map((stage, idx) => {
                    const isActive = idx <= currentStageIdx;
                    const isCurrent = idx === currentStageIdx;
                    
                    return (
                      <div key={stage.id} className="relative z-10 flex flex-col items-center gap-3 w-20">
                        <div 
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                            isActive 
                              ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' 
                              : 'bg-white border-2 border-slate-100 text-slate-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl">{stage.icon}</span>
                        </div>
                        <span className={`text-xs font-bold text-center ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                          {stage.label}
                        </span>
                        {isCurrent && !isCompleted && (
                          <span className="absolute -bottom-6 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Parts Approval Section / Parts History */}
                {app.requestedParts && app.requestedParts.length > 0 ? (
                  <PartsApproval 
                    appointmentId={app.id} 
                    requestedParts={app.requestedParts} 
                    isReadOnly={app.status !== 'waiting_parts'} 
                  />
                ) : (
                  app.status === 'waiting_parts' && (
                    <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-amber-500 text-3xl">hourglass_empty</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg mb-2">جاري تجهيز قائمة القطع</h4>
                      <p className="text-slate-500 text-sm max-w-sm mx-auto">
                        السيارة حالياً بانتظار توفر القطع. سيقوم الفني برفع قائمة القطع المطلوبة قريباً لتتمكن من مراجعتها.
                      </p>
                    </div>
                  )
                )}

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
