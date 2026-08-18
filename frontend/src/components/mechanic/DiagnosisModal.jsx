import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mechanicAPI, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const URGENCY_OPTIONS = [
  { value: 'low',    label: 'منخفض — يمكن تأجيله' },
  { value: 'normal', label: 'عادي — صيانة دورية / متوسطة' },
  { value: 'high',   label: 'عالٍ — خطر على السلامة أو المحرك' },
];

export default function DiagnosisModal({ task, onClose }) {
  const queryClient = useQueryClient();

  // Form fields pre-filled from existing report if available
  const [odometer,    setOdometer]    = useState(task?.report?.odometer !== undefined && task?.report?.odometer !== null ? String(task.report.odometer) : '');
  const [obd2Codes,   setObd2Codes]   = useState(task?.report?.obd2_codes || '');
  const [visualNotes, setVisualNotes] = useState(task?.report?.visual_notes || '');
  const [diagnostics, setDiagnostics] = useState(task?.report?.diagnostics || '');
  const [repairPlan,  setRepairPlan]  = useState(task?.report?.repair_plan || '');
  const [urgency,     setUrgency]     = useState(task?.report?.urgency_level || 'normal');

  // Submit diagnosis report
  const reportMutation = useMutation({
    mutationFn: mechanicAPI.submitDiagnosis,
    onSuccess: () => {
      toast.success('تم اعتماد تقرير الفحص الفني بنجاح');
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'tasks'] });
      onClose();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء حفظ التقرير'));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    reportMutation.mutate({
      appointment_id: task.appointment_id || task.id,
      odometer:       odometer ? parseInt(odometer) : null,
      obd2_codes:     obd2Codes,
      visual_notes:   visualNotes,
      diagnostics,
      repair_plan:    repairPlan,
      urgency_level:  urgency,
      mechanic_notes: '',
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
              <span className="material-symbols-outlined text-blue-600">plumbing</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">تقرير الفحص الفني</h2>
              <p className="text-xs text-slate-500 mt-0.5">توثيق تشخيص المركبة</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          
          {/* Vehicle Context Banner */}
          <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                <span className="material-symbols-outlined">directions_car</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{task.vehicle}</h3>
                <p className="font-mono text-xs font-bold text-slate-400 uppercase mt-0.5">{task.plate}</p>
              </div>
            </div>
            <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-xs border border-amber-100 max-w-xs">
              <span className="font-bold block text-[10px] uppercase mb-0.5 opacity-80">شكوى العميل:</span>
              <span className="font-medium line-clamp-2">{task.clientIssue}</span>
            </div>
          </div>

          {/* Form */}
          <form id="diagnosisForm" onSubmit={handleSubmit} className="space-y-6">

            {reportMutation.isError && (
              <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-bold border border-rose-100">
                حدث خطأ أثناء حفظ التقرير. يرجى المحاولة مرة أخرى.
              </div>
            )}

            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-slate-400">speed</span>
                  قراءة العداد (كم)
                </label>
                <input
                  type="number"
                  value={odometer}
                  onChange={e => setOdometer(e.target.value)}
                  placeholder="مثال: 125000"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-slate-400">priority_high</span>
                  مستوى الأهمية
                </label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none"
                >
                  {URGENCY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* OBD2 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-400">memory</span>
                أكواد فحص الكمبيوتر (OBD2)
              </label>
              <input
                type="text"
                value={obd2Codes}
                onChange={e => setObd2Codes(e.target.value)}
                placeholder="مثال: P0300, P0420"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
              />
            </div>

            {/* Visual Inspection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-400">visibility</span>
                ملاحظات الفحص البصري
              </label>
              <textarea
                value={visualNotes}
                onChange={e => setVisualNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
              />
            </div>

            {/* Diagnostics */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-400">car_repair</span>
                التشخيص الفني <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                value={diagnostics}
                onChange={e => setDiagnostics(e.target.value)}
                rows={3}
                placeholder="السبب الجذري للمشكلة..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
              />
            </div>

            {/* Repair Plan */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-400">build</span>
                خطة الإصلاح <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                value={repairPlan}
                onChange={e => setRepairPlan(e.target.value)}
                rows={3}
                placeholder="الخطوات المطلوبة للإصلاح..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="diagnosisForm"
            disabled={reportMutation.isPending}
            className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {reportMutation.isPending ? (
              <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">check</span>
            )}
            اعتماد التقرير
          </button>
        </div>

      </div>
    </div>
  );
}
