/**
 * StockAdjustmentModal — Presentational modal for adjusting item stock quantity.
 * Pure component: state management and handlers are controlled by the parent.
 * 
 * Props:
 * - isOpen: boolean
 * - item: { name, sku, stock, image }
 * - qty: number
 * - reason: string
 * - onClose: function
 * - onQtyChange: function(newQty)
 * - onReasonChange: function(newReason)
 * - onSubmit: function()
 */
export default function StockAdjustmentModal({
  isOpen,
  item,
  qty,
  reason,
  onClose,
  onQtyChange,
  onReasonChange,
  onSubmit
}) {
  if (!isOpen || !item) return null;

  const handleIncrement = () => {
    onQtyChange((qty || 0) + 1);
  };

  const handleDecrement = () => {
    if ((qty || 0) > 0) {
      onQtyChange((qty || 0) - 1);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border-slate flex items-center justify-between bg-surface-container-low">
          <h3 className="text-xl font-bold text-primary">تعديل المخزون</h3>
          <button 
            type="button"
            className="text-secondary hover:text-danger-text transition-colors p-1 rounded-full flex items-center justify-center" 
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="p-8 space-y-6">
            {/* Item Info Summary */}
            <div className="flex items-center gap-4 bg-surface-container p-4 rounded-xl">
              <div className="w-16 h-16 bg-white rounded-lg border border-border-slate overflow-hidden shrink-0">
                <img 
                  className="w-full h-full object-cover" 
                  src={item.image} 
                  alt={item.name} 
                />
              </div>
              <div>
                <p className="font-bold text-lg text-on-background">{item.name}</p>
                <p className="data-mono text-sm text-secondary">{item.sku}</p>
              </div>
            </div>

            {/* Qty Controls */}
            <div className="space-y-3 text-center">
              <label className="text-sm font-bold text-secondary block">
                الكمية الحالية: <span className="text-primary font-bold">{item.stock}</span>
              </label>
              <div className="flex items-center justify-center gap-6">
                <button 
                  type="button"
                  onClick={handleDecrement}
                  className="w-12 h-12 rounded-full border-2 border-border-slate flex items-center justify-center hover:bg-danger-bg hover:border-danger-text hover:text-danger-text transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>

                <input 
                  type="number"
                  value={qty}
                  onChange={(e) => onQtyChange(parseInt(e.target.value) || 0)}
                  className="w-24 text-center text-2xl font-bold border-0 bg-surface-container-high rounded-xl focus:ring-2 focus:ring-primary-container outline-none py-2"
                  min="0"
                />

                <button 
                  type="button"
                  onClick={handleIncrement}
                  className="w-12 h-12 rounded-full border-2 border-border-slate flex items-center justify-center hover:bg-success-bg hover:border-success-text hover:text-success-text transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            {/* Reason Text Area */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-secondary block">سبب التعديل</label>
              <textarea 
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="أدخل سبب تعديل المخزون (مثال: جرد دوري، تلف، إرجاع...)"
                className="w-full p-4 bg-surface-container rounded-xl border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all text-sm h-24 resize-none outline-none"
              />
            </div>
          </div>

          {/* Actions Footer */}
          <div className="p-6 bg-surface-container-low border-t border-border-slate flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 border border-border-slate rounded-lg font-bold text-secondary hover:bg-surface-variant transition-all"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="flex-[2] py-3 bg-primary-container text-white rounded-lg font-bold hover:bg-teal-hover shadow-lg shadow-primary-container/20 transition-all"
            >
              تحديث المخزون
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
