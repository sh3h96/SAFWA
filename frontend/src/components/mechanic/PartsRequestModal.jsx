import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryAPI, requiredPartsAPI, getErrorMessage } from '../../services/api';
import NewPartRequestModal from './NewPartRequestModal';
import toast from 'react-hot-toast';

export default function PartsRequestModal({ appointmentId, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedParts, setSelectedParts] = useState({}); // { [partId]: { part, quantity } }
  const [isNewPartModalOpen, setIsNewPartModalOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', debouncedSearch],
    queryFn: () => inventoryAPI.getAll(debouncedSearch),
  });

  const inventoryParts = Array.isArray(inventoryData) ? inventoryData : (inventoryData?.items || []);

  const submitPartsMutation = useMutation({
    mutationFn: (data) => requiredPartsAPI.submit(data),
    onSuccess: (res) => {
      toast.success(res.message || 'تم إرسال طلب قطع الغيار للإدارة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['assignedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['requiredParts'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء تقديم طلب قطع الغيار'));
    }
  });

  const handleAddOrUpdatePart = (part, qtyDelta) => {
    setSelectedParts(prev => {
      const current = prev[part.id] ? prev[part.id].quantity : 0;
      const newQty = current + qtyDelta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[part.id];
        return copy;
      }
      return {
        ...prev,
        [part.id]: { part, quantity: newQty }
      };
    });
  };

  const handleSetPartQuantity = (part, exactQty) => {
    const qty = parseInt(exactQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setSelectedParts(prev => {
        const copy = { ...prev };
        delete copy[part.id];
        return copy;
      });
      return;
    }
    setSelectedParts(prev => ({
      ...prev,
      [part.id]: { part, quantity: qty }
    }));
  };

  const handleRemovePart = (partId) => {
    setSelectedParts(prev => {
      const copy = { ...prev };
      delete copy[partId];
      return copy;
    });
  };

  const handleSubmitAll = () => {
    const partsArray = Object.values(selectedParts).map(item => ({
      part_id: item.part.id,
      quantity: item.quantity
    }));

    if (partsArray.length === 0) {
      toast.error('يرجى اختيار قطعة غيار واحدة على الأقل');
      return;
    }

    submitPartsMutation.mutate({
      appointment_id: appointmentId,
      parts: partsArray
    });
  };

  const selectedList = Object.values(selectedParts);
  const totalEstimatedCost = selectedList.reduce((acc, item) => acc + (parseFloat(item.part.price || 0) * item.quantity), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Centered Modal Container */}
      <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center border border-teal-100 shadow-sm">
              <span className="material-symbols-outlined text-2xl">build</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">طلب قطع غيار للمهمة</h2>
              <p className="text-xs text-slate-500">ابحث عن قطع الغيار المتاحة بالمخزون وحدد الكمية المطلوبة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Modal Content / Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

          {/* Centered Search Header */}
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن قطعة الغيار بالاسم أو الرقم المسلسل (SKU)..."
              className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-teal-600 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Search Catalog Results List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">كتالوج المخزون المتوفر</h4>
            {isLoading ? (
              <div className="py-8 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs font-bold">جاري البحث في المخزون...</p>
              </div>
            ) : inventoryParts.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <span className="material-symbols-outlined text-slate-400 text-3xl mb-1">inventory_2</span>
                <p className="text-xs font-bold text-slate-600">لم يتم العثور على قطع تطابق البحث الحالي</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {inventoryParts.map(part => {
                  const selectedCount = selectedParts[part.id]?.quantity || 0;
                  const isStockAvailable = part.stock_quantity > 0;
                  return (
                    <div
                      key={part.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-800 text-sm truncate">{part.name}</h5>
                          {part.part_number && (
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                              {part.part_number}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="font-mono font-bold text-teal-700">{part.price} ر.ي</span>
                          <span className={`font-bold ${isStockAvailable ? 'text-emerald-600' : 'text-rose-500'}`}>
                            المتوفر بالمخزون: {part.stock_quantity ?? 0}
                          </span>
                        </div>
                      </div>

                      {/* Add / Adjust Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedCount > 0 ? (
                          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleAddOrUpdatePart(part, -1)}
                              className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center justify-center text-xs transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={selectedCount}
                              onChange={(e) => handleSetPartQuantity(part, e.target.value)}
                              className="w-10 text-center font-mono font-bold text-xs text-slate-800 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddOrUpdatePart(part, 1)}
                              className="w-7 h-7 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-bold flex items-center justify-center text-xs transition-colors"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddOrUpdatePart(part, 1)}
                            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-teal-600/20 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">add</span>
                            <span>إضافة للطلب</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart / Selected Items Summary Section */}
          {selectedList.length > 0 && (
            <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100/80 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-teal-100/60 pb-2">
                <h4 className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-teal-700">shopping_cart</span>
                  <span>القطع المطلوبة لطلب الشراء ({selectedList.length})</span>
                </h4>
                <span className="text-xs font-bold text-teal-800">
                  المبلغ التقديري: <span className="font-mono font-extrabold text-sm">{totalEstimatedCost.toFixed(2)}</span> ر.ي
                </span>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {selectedList.map(({ part, quantity }) => (
                  <div key={part.id} className="bg-white p-2.5 rounded-xl border border-teal-100/60 flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-800 truncate">{part.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-slate-500">الكمية: <strong className="text-teal-800 font-bold">{quantity}</strong></span>
                      <span className="font-mono font-bold text-slate-700">{(parseFloat(part.price || 0) * quantity).toFixed(2)} ر.ي</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePart(part.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="إزالة من قائمة الطلب"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsNewPartModalOpen(true)}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">add_shopping_cart</span>
            <span>طلب قطعة غير موجودة بالنظام</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSubmitAll}
              disabled={selectedList.length === 0 || submitPartsMutation.isPending}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5 disabled:opacity-50 disabled:shadow-none"
            >
              {submitPartsMutation.isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">send</span>
              )}
              <span>إرسال طلب قطع الغيار ({selectedList.length})</span>
            </button>
          </div>
        </div>

      </div>

      {/* Embedded New Part Request Modal */}
      {isNewPartModalOpen && (
        <NewPartRequestModal
          appointmentId={appointmentId}
          onClose={() => setIsNewPartModalOpen(false)}
          onSuccess={onSuccess}
        />
      )}

    </div>
  );
}
