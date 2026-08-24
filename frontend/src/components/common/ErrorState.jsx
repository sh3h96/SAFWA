import React from 'react';

export default function ErrorState({ title = 'حدث خطأ في تحميل البيانات', message = 'تعذر الاتصال بالخادم أو جلب المعلومات الحالية.', onRetry }) {
  return (
    <div className="w-full py-12 px-6 flex flex-col items-center justify-center text-center bg-rose-50/50 border border-rose-100 rounded-3xl my-4">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
        <span className="material-symbols-outlined text-3xl">error_outline</span>
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-600 max-w-md mb-6 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
