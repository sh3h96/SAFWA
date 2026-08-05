export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'تأكيد', 
  cancelText = 'إلغاء', 
  isDanger = false 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
            <span className="material-symbols-outlined text-3xl">
              {isDanger ? 'warning' : 'help_outline'}
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {message}
          </p>
          
          <div className="flex gap-3 w-full mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={
                isDanger 
                  ? "flex-1 bg-red-600 text-white font-medium py-2.5 rounded-xl hover:bg-red-700 transition-colors"
                  : "flex-1 bg-teal-600 text-white font-medium py-2.5 rounded-xl hover:bg-teal-700 transition-colors"
              }
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
