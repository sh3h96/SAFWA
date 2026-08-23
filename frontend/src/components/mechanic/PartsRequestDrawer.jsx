import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mechanicAPI, inventoryAPI, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

export default function PartsRequestDrawer({ task, onClose }) {
  const queryClient = useQueryClient();

  // Cart state: { [partId]: { part, qty } }
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Fetch inventory catalog
  const { data: inventoryData, isLoading, isError } = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryAPI.getAll,
  });

  // Submit parts request
  const partsMutation = useMutation({
    mutationFn: async (data) => {
      return await mechanicAPI.submitPartsRequest(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['mechanicPartsRequests'] });
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء تقديم طلب قطع الغيار'));
    }
  });

  // ─── Post-Submit ─────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
        {/* Drawer */}
        <div className="fixed inset-y-0 left-0 z-[70] w-full max-w-xl bg-white shadow-2xl flex flex-col items-center justify-center animate-in slide-in-from-left duration-300 p-8 text-center">
          <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <span className="material-symbols-outlined text-5xl text-amber-500">inventory_2</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">تم تقديم طلب القطع!</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-10">
            تم تحويل حالة المركبة إلى "بانتظار قطع الغيار". سيتم إعلامك عند توفر القطع.
          </p>
          <button
            onClick={onClose}
            className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all"
          >
            العودة للجدول
          </button>
        </div>
      </>
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const parts = inventoryData?.items || inventoryData || [];
  const filtered = parts.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.partNumber?.toLowerCase().includes(search.toLowerCase())
  );
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const addToCart = (part) => {
    setCart(prev => ({
      ...prev,
      [part.id]: { part, qty: (prev[part.id]?.qty || 0) + 1 },
    }));
  };

  const removeFromCart = (partId) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[partId]?.qty > 1) next[partId] = { ...next[partId], qty: next[partId].qty - 1 };
      else delete next[partId];
      return next;
    });
  };

  const handleSubmit = () => {
    if (cartItems.length === 0) return;
    partsMutation.mutate({
      appointment_id: task.appointment_id,
      parts: cartItems.map(i => ({ id: i.part.id, qty: i.qty })),
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-[70] w-full max-w-4xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
        
        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
              <span className="material-symbols-outlined text-amber-500">inventory_2</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">طلب قطع الغيار</h2>
              <p className="text-xs text-slate-500 mt-0.5">اختر القطع المطلوبة لمركبة العميل</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
          
          {/* Vehicle Context Banner */}
          <div className="bg-white rounded-2xl p-5 mb-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined">directions_car</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{task.vehicle}</h3>
                <p className="font-mono text-xs font-bold text-slate-400 uppercase mt-0.5">{task.plate}</p>
              </div>
            </div>
            {cartCount > 0 && (
              <div className="bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full text-xs font-bold border border-amber-100">
                {cartCount} قطعة في الطلب
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20 text-slate-400">
              <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
            </div>
          ) : isError ? (
            <div className="text-center py-20 text-rose-500">
              <span className="material-symbols-outlined text-4xl block mb-2">error</span>
              <p className="font-bold text-sm">فشل تحميل المخزن</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ── Catalog ── */}
              <div className="lg:col-span-2 space-y-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute top-3.5 right-4 text-slate-400 text-[18px]">search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ابحث عن قطعة..."
                    className="w-full pr-11 pl-5 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filtered.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-slate-400">
                      <span className="material-symbols-outlined text-3xl block mb-2">search_off</span>
                      <span className="text-sm">لا توجد نتائج</span>
                    </div>
                  ) : filtered.map(part => {
                    const inCart = cart[part.id]?.qty || 0;
                    const outOfStock = (part.stock ?? part.quantity ?? 0) === 0;
                    return (
                      <div key={part.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{part.name}</h4>
                            {part.partNumber && (
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{part.partNumber}</p>
                            )}
                          </div>
                          {outOfStock && (
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg">نفذ</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-auto">
                          <span className="text-[11px] text-slate-400 flex flex-col gap-0.5">
                            <span>المخزون: {part.stock ?? part.quantity ?? '—'}</span>
                            <span className="text-emerald-600 font-bold">{Number(part.salePrice || part.purchasePrice || 0).toFixed(2)} ر.س</span>
                          </span>
                          {inCart > 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removeFromCart(part.id)}
                                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors font-bold text-lg leading-none"
                              >−</button>
                              <span className="text-xs font-bold text-slate-700 w-3 text-center">{inCart}</span>
                              <button
                                onClick={() => addToCart(part)}
                                disabled={outOfStock}
                                className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-700 transition-colors font-bold text-lg leading-none disabled:opacity-40"
                              >+</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(part)}
                              disabled={outOfStock}
                              className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              إضافة
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Cart / Order Summary ── */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm sticky top-0">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-slate-400">shopping_cart</span>
                    الطلب الحالي
                  </h3>

                  {cartItems.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">inventory_2</span>
                      لم تختر أي قطع
                    </div>
                  ) : (
                    <div className="space-y-3 mb-5">
                      {cartItems.map(({ part, qty }) => {
                        const unitPrice = Number(part.salePrice || part.purchasePrice || 0);
                        const itemTotal = unitPrice * qty;
                        return (
                          <div key={part.id} className="flex justify-between items-center text-sm py-2 border-b border-slate-50">
                            <div>
                              <div className="font-bold text-slate-700 text-xs">{part.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                الكمية: {qty} <span className="mx-1">•</span> {unitPrice.toFixed(2)} ر.س
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-emerald-600 text-xs">{itemTotal.toFixed(2)} ر.س</div>
                              <button onClick={() => { const next = { ...cart }; delete next[part.id]; setCart(next); }}
                                className="text-rose-400 hover:text-rose-600 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <span className="font-bold text-slate-700 text-xs">الإجمالي:</span>
                        <span className="text-sm font-bold text-emerald-600">
                          {cartItems.reduce((sum, { part, qty }) => sum + (Number(part.salePrice || part.purchasePrice || 0) * qty), 0).toFixed(2)} ر.س
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={cartItems.length === 0 || partsMutation.isPending}
                    className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-xs hover:bg-amber-600 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {partsMutation.isPending
                      ? <><span className="material-symbols-outlined animate-spin text-[16px]">sync</span>جاري الإرسال...</>
                      : <><span className="material-symbols-outlined text-[16px]">send</span>تقديم الطلب</>
                    }
                  </button>

                  {partsMutation.isError && (
                    <p className="text-rose-500 text-[10px] font-bold text-center mt-3">
                      {partsMutation.error?.response?.data?.message || 'حدث خطأ في الإرسال. يرجى المحاولة مرة أخرى.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
