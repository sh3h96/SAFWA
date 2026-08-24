/**
 * AddPartModal — Presentational modal component for adding a new spare part.
 * Pure component: state management and handlers controlled by parent.
 * 
 * Props:
 * - isOpen: boolean
 * - formData: object
 * - onClose: function
 * - onChange: function(field, value)
 * - onSubmit: function()
 */
export default function AddPartModal({
  isOpen,
  formData,
  onClose,
  onChange,
  onSubmit
}) {
  if (!isOpen) return null;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border-slate flex items-center justify-between bg-surface-container-low">
          <h3 className="text-xl font-bold text-primary">إضافة قطعة جديدة</h3>
          <button 
            type="button"
            className="text-secondary hover:text-danger-text transition-colors p-1 rounded-full flex items-center justify-center" 
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-secondary">اسم القطعة</label>
              <input 
                type="text" 
                value={formData.name || ''}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="مثال: فلتر زيت تويوتا"
                className="p-3 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-secondary">رمز SKU</label>
              <input 
                type="text" 
                value={formData.sku || ''}
                onChange={(e) => onChange('sku', e.target.value)}
                placeholder="SKU-TY-001"
                className="p-3 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none text-sm data-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-secondary">الفئة</label>
              <select 
                value={formData.category || 'فلاتر'}
                onChange={(e) => onChange('category', e.target.value)}
                className="p-3 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none text-sm"
              >
                <option value="فلاتر">فلاتر</option>
                <option value="فرامل">فرامل</option>
                <option value="كهرباء">كهرباء</option>
                <option value="زيوت">زيوت</option>
                <option value="محرك">محرك</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-secondary">الشركة المصنعة</label>
              <select 
                value={formData.manufacturer || 'Toyota'}
                onChange={(e) => onChange('manufacturer', e.target.value)}
                className="p-3 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none text-sm"
              >
                <option value="Toyota">Toyota</option>
                <option value="Nissan">Nissan</option>
                <option value="Universal">Universal</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-secondary">الكمية الابتدائية</label>
              <input 
                type="number" 
                value={formData.stock || 0}
                onChange={(e) => onChange('stock', parseInt(e.target.value) || 0)}
                className="p-3 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none text-sm"
                min="0"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-secondary">الحد الأقصى للمخزون</label>
              <input 
                type="number" 
                value={formData.maxStock || 50}
                onChange={(e) => onChange('maxStock', parseInt(e.target.value) || 0)}
                className="p-3 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none text-sm"
                min="1"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-secondary">سعر الشراء (ر.س)</label>
              <input 
                type="number" 
                value={formData.purchasePrice || 0}
                onChange={(e) => onChange('purchasePrice', parseFloat(e.target.value) || 0)}
                className="p-3 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none text-sm"
                min="0"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-secondary">سعر البيع (ر.س)</label>
              <input 
                type="number" 
                value={formData.salePrice || 0}
                onChange={(e) => onChange('salePrice', parseFloat(e.target.value) || 0)}
                className="p-3 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none text-sm"
                min="0"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-bold text-secondary">المورد</label>
              <input 
                type="text" 
                value={formData.supplier || ''}
                onChange={(e) => onChange('supplier', e.target.value)}
                placeholder="اسم الشركة الموردة"
                className="p-3 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none text-sm"
              />
            </div>
          </div>

          {/* Footer */}
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
              حفظ القطعة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
