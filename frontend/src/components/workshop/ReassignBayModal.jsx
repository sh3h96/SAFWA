import LicensePlate from '../common/LicensePlate';

/**
 * ReassignBayModal — Presentational modal for editing bay assignment, technician, and status.
 * Pure component: state management handled by parent container.
 */
export default function ReassignBayModal({
  isOpen,
  bay,
  technicians = [],
  statuses = [],
  selectedTechnician,
  selectedBayNumber,
  selectedStatus,
  onClose,
  onTechnicianChange,
  onBayChange,
  onStatusChange,
  onSubmit
}) {
  if (!isOpen || !bay) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px]" 
        onClick={onClose} 
      />

      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate z-10 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate flex justify-between items-center bg-surface">
          <h3 className="text-xl font-bold text-primary">تعديل تعيين المنصة</h3>
          <button 
            type="button"
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-full flex items-center justify-center" 
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Vehicle Card Summary */}
            <div className="flex gap-4 p-4 bg-surface-container rounded-xl">
              <div className="w-20 h-14 rounded-lg bg-slate-300 overflow-hidden shrink-0">
                {bay.image ? (
                  <img className="w-full h-full object-cover rounded-lg" src={bay.image} alt={bay.vehicleName} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <span className="material-symbols-outlined">directions_car</span>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-bold text-base text-on-background">
                  {bay.vehicleName || 'مركبة جديدة'} - {bay.title}
                </h4>
                {bay.plateNumber && (
                  <div className="mt-1">
                    <LicensePlate plateNumber={bay.plateNumber} variant="compact" />
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Change Technician */}
              <div>
                <label className="block text-sm font-bold mb-2 text-on-background">تغيير الفني المباشر</label>
                <select 
                  value={selectedTechnician}
                  onChange={(e) => onTechnicianChange(e.target.value)}
                  className="w-full bg-white border border-slate rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                >
                  {technicians.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                </select>
              </div>

              {/* Move to another bay */}
              <div>
                <label className="block text-sm font-bold mb-2 text-on-background">نقل إلى منصة أخرى</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4].map((num) => {
                    const isSelected = selectedBayNumber === num;
                    return (
                      <button 
                        key={num}
                        type="button"
                        onClick={() => onBayChange(num)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                          isSelected 
                            ? 'border-primary bg-primary-container text-on-primary-container' 
                            : 'border-slate hover:border-primary text-on-surface-variant'
                        }`}
                      >
                        منصة {num}
                      </button>
                    );
                  })}
                  <button 
                    type="button"
                    onClick={() => onBayChange(0)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                      selectedBayNumber === 0 
                        ? 'border-primary bg-primary-container text-on-primary-container' 
                        : 'border-slate hover:border-primary text-on-surface-variant'
                    }`}
                  >
                    خارج المنصة
                  </button>
                </div>
              </div>

              {/* Change Status */}
              <div>
                <label className="block text-sm font-bold mb-2 text-on-background">تغيير الحالة</label>
                <select 
                  value={selectedStatus}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full bg-white border border-slate rounded-lg py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                >
                  {statuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="p-6 bg-surface-container flex gap-3 border-t border-slate">
            <button 
              type="submit" 
              className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-teal-hover transition-colors"
            >
              حفظ التغييرات
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-white border border-slate rounded-xl font-bold hover:bg-slate-50 transition-colors text-secondary"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
