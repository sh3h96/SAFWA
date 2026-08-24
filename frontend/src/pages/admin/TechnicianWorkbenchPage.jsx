import { useState, useEffect } from 'react';
import LicensePlate from '../../components/common/LicensePlate';
import Avatar from '../../components/common/Avatar';
import { technicianResponse } from '../../mock/admin/technician';

export default function TechnicianWorkbenchPage() {
  const [data] = useState(technicianResponse);
  const [seconds, setSeconds] = useState(technicianResponse.activeTask.elapsedSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('in_progress');

  // Live timer interval
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Format seconds to HH:MM:SS
  const formatTimer = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div className="space-y-8 max-w-[1320px] mx-auto">
      {/* Top Profile Bar */}
      <div className="bg-white border border-border-slate rounded-xl p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar 
            src={data.profile.avatar} 
            name={data.profile.name} 
            size="md" 
          />
          <div>
            <h2 className="font-bold text-base text-on-background">{data.profile.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-success-text" />
              <span className="text-xs text-success-text font-medium">{data.profile.status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-secondary font-medium">
          <span className="bg-surface-container px-3 py-1.5 rounded-lg border border-slate">
            كشك الفني • حارة الميكانيكا 1
          </span>
        </div>
      </div>

      {/* Quick Timer & Global Stats */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Timer Card (8 cols) */}
        <div className="md:col-span-8 bg-white border border-border-slate rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-8xl text-secondary">timer</span>
          </div>
          <h3 className="text-secondary font-bold text-sm mb-3">الوقت المنقضي على المهمة الحالية</h3>
          <div className="data-mono text-4xl md:text-5xl font-bold text-primary-container tracking-widest tabular-nums py-3 px-8 bg-surface-container rounded-xl border border-outline-variant/30 shadow-inner">
            {formatTimer(seconds)}
          </div>
          <div className="flex gap-4 mt-5">
            <button 
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold transition-all shadow-sm active:scale-95 ${
                isTimerRunning 
                  ? 'border-danger-text text-danger-text hover:bg-danger-bg' 
                  : 'border-success-text text-success-text hover:bg-success-bg'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {isTimerRunning ? 'pause_circle' : 'play_circle'}
              </span>
              <span>{isTimerRunning ? 'إيقاف مؤقت' : 'استئناف العمل'}</span>
            </button>
          </div>
        </div>

        {/* Stats Cards (4 cols) */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-white border border-border-slate rounded-xl p-5 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs text-on-surface-variant">السيارات المتبقية</p>
              <p className="text-2xl font-bold text-on-surface mt-1">{data.stats.remainingVehicles} سيارات</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-2xl">directions_car</span>
            </div>
          </div>

          <div className="bg-white border border-border-slate rounded-xl p-5 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs text-on-surface-variant">المهام المكتملة اليوم</p>
              <p className="text-2xl font-bold text-on-surface mt-1">{data.stats.completedToday} مهمة</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center text-success-text">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
          </div>
        </div>
      </section>

      {/* Active Task Highlight */}
      <section className="space-y-4">
        <h3 className="font-bold text-lg text-on-surface-variant px-1">المهمة النشطة</h3>
        <div className="bg-on-secondary-fixed text-white rounded-xl overflow-hidden shadow-lg border-2 border-primary-container relative">
          <div className="absolute top-4 left-4">
            <span className="px-3.5 py-1 bg-primary-container text-white text-xs font-bold rounded-full animate-pulse shadow">
              قيد العمل
            </span>
          </div>

          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
              <img 
                className="w-full h-full object-cover" 
                src={data.activeTask.image} 
                alt={data.activeTask.vehicleModel} 
              />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="text-xl font-bold text-white">{data.activeTask.vehicleModel}</h4>
                <LicensePlate plateNumber={data.activeTask.plateNumber} />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {data.activeTask.complaints.map((c, i) => (
                  <span 
                    key={i} 
                    className="bg-white/10 border border-white/20 px-3 py-1 rounded text-xs flex items-center gap-1.5 text-slate-200"
                  >
                    <span className="material-symbols-outlined text-sm">{c.icon}</span>
                    <span>{c.label}</span>
                  </span>
                ))}
              </div>

              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                {data.activeTask.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Repair Status Switcher (Action Grid) */}
      <section className="space-y-4">
        <h3 className="font-bold text-lg text-on-surface-variant px-1">تحديث الحالة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Button 1: Inspection */}
          <button 
            onClick={() => setCurrentStatus('inspect')}
            className={`group flex flex-col items-center justify-center gap-3 bg-white border-2 rounded-xl p-6 min-h-[120px] transition-all active:scale-95 ${
              currentStatus === 'inspect' ? 'border-primary-container shadow-md' : 'border-outline-variant hover:border-primary-container'
            }`}
          >
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
              currentStatus === 'inspect' ? 'bg-primary-container text-white border-primary-container' : 'border-outline-variant group-hover:bg-primary-container group-hover:text-white'
            }`}>
              <span className="material-symbols-outlined text-2xl">search</span>
            </div>
            <span className="font-bold text-sm text-on-surface text-center">بدء الفحص</span>
          </button>

          {/* Button 2: Order Parts */}
          <button 
            onClick={() => setCurrentStatus('parts')}
            className={`group flex flex-col items-center justify-center gap-3 bg-warning-bg border-2 rounded-xl p-6 min-h-[120px] transition-all active:scale-95 ${
              currentStatus === 'parts' ? 'border-warning-text shadow-md' : 'border-transparent hover:opacity-90'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center text-warning-text">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                inventory_2
              </span>
            </div>
            <span className="font-bold text-sm text-on-tertiary-fixed-variant text-center">طلب قطع غيار</span>
          </button>

          {/* Button 3: In Progress (Active) */}
          <button 
            onClick={() => setCurrentStatus('in_progress')}
            className={`group relative flex flex-col items-center justify-center gap-3 bg-primary-container border-2 rounded-xl p-6 min-h-[120px] transition-all active:scale-95 shadow-md ${
              currentStatus === 'in_progress' ? 'border-primary-container ring-2 ring-primary-container/30' : 'border-transparent hover:opacity-90'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                build
              </span>
            </div>
            <span className="font-bold text-sm text-white text-center">جاري الإصلاح</span>
          </button>

          {/* Button 4: Done */}
          <button 
            onClick={() => setCurrentStatus('done')}
            className={`group flex flex-col items-center justify-center gap-3 bg-success-bg border-2 rounded-xl p-6 min-h-[120px] transition-all active:scale-95 ${
              currentStatus === 'done' ? 'border-success-text shadow-md' : 'border-transparent hover:opacity-90'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center text-success-text">
              <span className="material-symbols-outlined text-2xl">task_alt</span>
            </div>
            <span className="font-bold text-sm text-success-text text-center">تم الإنهاء والتسليم</span>
          </button>
        </div>
      </section>

      {/* Task Queue (Upcoming Tasks) */}
      <section className="space-y-4 pb-8">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-lg text-on-surface-variant">قائمة المهام القادمة</h3>
          <button className="text-primary font-bold text-sm hover:underline">عرض الكل</button>
        </div>

        <div className="space-y-3">
          {data.upcomingTasks.map((task) => (
            <div 
              key={task.id}
              className="bg-white border border-border-slate rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-surface-container rounded-lg overflow-hidden shrink-0 border border-slate">
                  <img className="w-full h-full object-cover" src={task.image} alt={task.vehicleModel} />
                </div>
                <div>
                  <p className="font-bold text-on-surface text-base">{task.vehicleModel}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <LicensePlate plateNumber={task.plateNumber} variant="compact" />
                    <span className="text-xs text-on-surface-variant">• {task.serviceType}</span>
                  </div>
                </div>
              </div>

              <div className="text-left">
                <p className="text-xs text-on-surface-variant">موعد الاستلام</p>
                <p className="font-bold text-on-surface text-sm data-mono mt-0.5">{task.deliveryTime}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
