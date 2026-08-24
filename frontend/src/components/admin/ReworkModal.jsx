import React, { useState } from 'react';

export default function ReworkModal({ isOpen, appointment, onClose, onSubmit, isLoading }) {
  const [reworkNotes, setReworkNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !appointment) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reworkNotes.trim()) {
      setErrorMsg('يرجى كتابة تعليمات وملاحظات إعادة الإصلاح.');
      return;
    }
    setErrorMsg('');
    onSubmit({ rework_notes: reworkNotes.trim() });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose} 
      />

      <div className="relative bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">replay</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">إعادة إلى قسم الإصلاح</h3>
              <p className="text-xs text-slate-500">موعد #{appointment.id} - {appointment.car || appointment.vehicle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ملاحظات وتعليمات إعادة الإصلاح <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={reworkNotes}
              onChange={(e) => setReworkNotes(e.target.value)}
              placeholder="اكتب بالتفصيل سبب إعادة المركبة والوظائف أو المشاكل المطلوبة من الفني معالجتها..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
            />
            {errorMsg && <p className="text-xs text-rose-500 font-bold mt-1.5">{errorMsg}</p>}
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">info</span>
              تنبيه مهم:
            </p>
            <p className="text-[11px] leading-relaxed text-amber-900">
              سيتم إعادة حالة الموعد إلى (جاري الإصلاح)، وإرسال الملاحظات مباشرة لكارت الفني. الفاتورة والبيانات الحالية ستبقى محفوظة.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">send</span>
                  تأكيد إعادتها للإصلاح
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
