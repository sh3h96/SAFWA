import React from 'react';

export default function EmptyState({ 
  icon = 'inbox', 
  title = 'لا توجد بيانات متاحة', 
  message = 'لم يتم العثور على أي سجلات في الوقت الحالي.',
  actionLabel,
  onAction
}) {
  return (
    <div className="w-full py-12 px-6 flex flex-col items-center justify-center text-center bg-slate-50/60 border border-slate-100 rounded-3xl my-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer mt-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
