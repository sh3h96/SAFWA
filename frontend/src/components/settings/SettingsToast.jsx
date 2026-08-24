/**
 * SettingsToast — Floating feedback alert toast on save.
 */
export default function SettingsToast({ onClose }) {
  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-inverse-surface text-white px-5 py-4 rounded-xl shadow-2xl border border-white/10 animate-bounce">
      <span className="material-symbols-outlined text-success-text text-2xl">
        check_circle
      </span>
      <div>
        <p className="font-bold text-sm">تم حفظ التغييرات بنجاح!</p>
        <p className="text-xs text-slate-300">
          تم تحديث إعدادات النظام وتطبيقها في كامل اللوحة.
        </p>
      </div>
      <button
        onClick={onClose}
        className="mr-3 text-slate-400 hover:text-white"
        aria-label="إغلاق"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}
