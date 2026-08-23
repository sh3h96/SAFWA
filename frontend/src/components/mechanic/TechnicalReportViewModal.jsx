import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const URGENCY_CONFIG = {
  low: { label: 'منخفض - يمكن تأجيله', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  normal: { label: 'عادي - صيانة دورية', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  medium: { label: 'متوسط - يحتاج اهتمام قريب', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  high: { label: 'عالي - خطر على السلامة والمحرك', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  urgent: { label: 'طارئ - إيقاف فوري للسيارة', color: 'bg-red-100 text-red-900 border-red-300' }
};

export default function TechnicalReportViewModal({ task, onClose }) {
  if (!task) return null;

  const report = task.reportDetails || {};
  const urgencyKey = report.urgency_level || 'normal';
  const urgency = URGENCY_CONFIG[urgencyKey] || URGENCY_CONFIG.normal;
  const laborCost = report.estimated_labor_cost ? parseFloat(report.estimated_labor_cost) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose} 
      />

      {/* Centered Modal */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-800">تقرير الفحص الفني والتشخيص</h3>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border ${urgency.color}`}>
                  {urgency.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                المركبة: <strong className="text-slate-700">{task.vehicle} ({task.plate})</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-6 space-y-6">

          {/* Client Reported Issue */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-amber-500">warning</span>
              شكوى / طلب العميل الأصلي
            </h4>
            <p className="text-sm text-slate-800 font-medium">{task.clientIssue || 'لا توجد ملاحظات مدخلة'}</p>
          </div>

          {/* Diagnostics Findings */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-teal-600">search</span>
              نتائج الفحص والتشخيص الفني
            </h4>
            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/80 text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
              {report.diagnostics || 'لم يتم إدخال تفاصيل التشخيص.'}
            </div>
          </div>

          {/* Recommended Repair Plan */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-blue-600">build</span>
              خطة الإصلاح والإجراءات الموصى بها
            </h4>
            <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-100/80 text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
              {report.repair_plan || 'لم يتم إدخال خطة الإصلاح.'}
            </div>
          </div>

          {/* Financial Summary: Labor Cost */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-400 text-xl">payments</span>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">أجور العمل التقديرية (أجر اليد)</p>
                <p className="text-xs text-slate-300">تكلفة العمليات والأيدي العاملة لإنهاء هذا الإصلاح</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(laborCost)}</span>
            </div>
          </div>

          {/* Rework History Section */}
          {((task.rework_history && task.rework_history.length > 0) || (report.rework_history && report.rework_history.length > 0)) && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-600">replay</span>
                سجل وسلسلة تعليمات إعادة الإصلاح (Rework History)
              </h4>
              <div className="space-y-2">
                {(task.rework_history || report.rework_history || []).map((rw, idx) => (
                  <div key={idx} className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold text-amber-900">
                      <span>طلب إعادة إصلاح #{rw.id || idx + 1} - بواسطة {rw.requested_by || 'الإدارة'}</span>
                      <span className="text-[10px] text-amber-700">{rw.requested_at ? new Date(rw.requested_at).toLocaleString('ar-YE') : ''}</span>
                    </div>
                    <p className="text-slate-800 font-medium">{rw.admin_notes}</p>
                    {rw.mechanic_notes && (
                      <p className="text-emerald-700 font-bold mt-1">ملاحظات الفني: {rw.mechanic_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requested Spare Parts */}
          {task.requestedParts && task.requestedParts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">inventory_2</span>
                قطع الغيار المطلوبة للعملية ({task.requestedParts.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {task.requestedParts.map(part => (
                  <div key={part.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs truncate">{part.name}</span>
                      <span className="text-xs font-mono font-bold text-slate-500">الكمية: {part.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">السعر الفردي: {formatCurrency(part.price || 0)}</span>
                      <span className={`font-bold px-2 py-0.5 rounded-lg text-[10px] ${
                        part.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        part.status === 'installed' ? 'bg-teal-100 text-teal-800' :
                        part.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {part.status === 'approved' ? 'معتمد' :
                         part.status === 'installed' ? 'تم التركيب' :
                         part.status === 'rejected' ? 'مرفوض' : 'بانتظار الموافقة'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            إغلاق التقرير
          </button>
        </div>

      </div>
    </div>
  );
}
