export default function ProductDetailsModal({ product, onClose }) {
  if (!product) return null;

  const isLowStock = product.stock <= product.minStock;
  const addedDate = product.createdAt ? new Date(product.createdAt).toLocaleDateString('ar-SA') : 'غير محدد';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar">
        <div className="px-8 py-10 bg-slate-50/50 border-b border-slate-100 flex flex-col items-center text-center">
          <button 
            onClick={onClose} 
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
          
          <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center font-bold text-4xl mb-4 bg-slate-100 text-slate-400">
            <span className="material-symbols-outlined text-4xl">inventory_2</span>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{product.name}</h2>
          
          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-600">
              {product.sku || `P${product.id}`}
            </span>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 gap-4">
            
            {/* Brand */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/50">
              <span className="block text-xs font-bold text-slate-400 mb-1">العلامة التجارية</span>
              <span className="text-sm font-bold text-slate-700">{product.manufacturer || 'غير محدد'}</span>
            </div>

            {/* Unit Price */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/50">
              <span className="block text-xs font-bold text-slate-400 mb-1">سعر الوحدة</span>
              <span className="text-lg font-bold text-primary font-mono">{product.purchasePrice} ر.س</span>
            </div>

            {/* Current Stock */}
            <div className={`p-4 rounded-xl border ${isLowStock ? 'bg-red-50 border-red-100/50' : 'bg-slate-50 border-slate-100/50'}`}>
              <span className={`block text-xs font-bold mb-1 ${isLowStock ? 'text-red-400' : 'text-slate-400'}`}>الكمية المتوفرة</span>
              <div className="flex items-center gap-1.5">
                {isLowStock && <span className="material-symbols-outlined text-red-500 text-[16px]">warning</span>}
                <span className={`text-lg font-bold font-mono ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>{product.stock}</span>
              </div>
            </div>

            {/* Min Stock */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/50">
              <span className="block text-xs font-bold text-slate-400 mb-1">الحد الأدنى للمخزون</span>
              <span className="text-sm font-bold text-slate-700 font-mono">{product.minStock || 0}</span>
            </div>

            {/* Added Date */}
            <div className="col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100/50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">تاريخ الإضافة</span>
              <span className="text-sm font-bold text-slate-700" dir="ltr">{addedDate}</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
