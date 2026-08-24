import { formatDate, formatCurrency } from '../../utils/formatters';
import ImageUploader from './ImageUploader';
import { useQueryClient } from '@tanstack/react-query';

export default function ProductDetailsModal({ product, onClose }) {
  const queryClient = useQueryClient();
  if (!product) return null;

  const stock = product.stock !== undefined ? product.stock : (product.stock_quantity !== undefined ? product.stock_quantity : 0);
  const minStock = product.minStock !== undefined ? product.minStock : (product.min_stock_level !== undefined ? product.min_stock_level : 5);
  const isLowStock = stock <= minStock;
  const addedDate = product.createdAt || product.created_at ? formatDate(product.createdAt || product.created_at) : 'غير محدد';
  const price = product.purchasePrice !== undefined ? product.purchasePrice : (product.price ? parseFloat(product.price) : 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar border border-slate-100"
      >

        {/* Header */}
        <div className="px-8 py-8 bg-slate-50/70 border-b border-slate-100 flex flex-col items-center text-center relative">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>

          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{product.name}</h2>

          <div className="flex items-center gap-2 mt-2 mb-4">
            <span className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-slate-900 text-white shadow-inner">
              {product.sku || product.part_number || `P${product.id}`}
            </span>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
              {product.category || 'قطع غيار'}
            </span>
          </div>

          <ImageUploader
            entityType="spare-part"
            entityId={product.id}
            currentImageUrl={product.image_url || product.image || product.imageUrl}
            onImageUpdated={() => {
              queryClient.invalidateQueries(['inventory']);
              queryClient.invalidateQueries(['adminRequiredPartsRequests']);
            }}
            onImageDeleted={() => {
              queryClient.invalidateQueries(['inventory']);
              queryClient.invalidateQueries(['adminRequiredPartsRequests']);
            }}
            label="صورة قطعة الغيار"
          />
        </div>

        {/* Details Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">

            {/* Brand / Manufacturer */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">الشركة المصنعة</span>
              <span className="text-sm font-bold text-slate-800">{product.manufacturer || product.brand || 'غير محدد'}</span>
            </div>

            {/* Price in Yemeni Riyal (ر.ي) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">سعر الوحدة</span>
              <span className="text-base font-bold text-teal-700 font-mono">{formatCurrency(price, 'ر.ي')}</span>
            </div>

            {/* Current Stock */}
            <div className={`p-4 rounded-2xl border ${isLowStock ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'} space-y-1`}>
              <span className={`block text-[11px] font-bold uppercase tracking-wider ${isLowStock ? 'text-rose-600' : 'text-slate-400'}`}>
                {isLowStock ? 'مخزون منخفض' : 'الكمية المتوفرة'}
              </span>
              <div className="flex items-center gap-1.5">
                {isLowStock && <span className="material-symbols-outlined text-rose-500 text-base">warning</span>}
                <span className={`text-lg font-bold font-mono ${isLowStock ? 'text-rose-700' : 'text-slate-800'}`}>
                  {stock} قطعة
                </span>
              </div>
            </div>

            {/* Min Stock */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">الحد الأدنى للتنبيه</span>
              <span className="text-sm font-bold text-slate-800 font-mono">{minStock} قطعة</span>
            </div>

            {/* Added Date */}
            <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400">تاريخ إضافة القطعة</span>
              <span className="font-bold text-slate-700 font-mono">{addedDate}</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
