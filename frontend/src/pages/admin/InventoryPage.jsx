import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { inventoryAPI, requiredPartsAPI } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ProductDetailsModal from '../../components/admin/ProductDetailsModal';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function InventoryPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'requests'
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Inventory Parts
  const { data: inventoryData, isLoading: isLoadingInventory, isFetching: isFetchingInventory, isError: isInventoryError, error: inventoryError } = useQuery({
    queryKey: ['inventory', debouncedSearch],
    queryFn: () => inventoryAPI.getAll(debouncedSearch),
    placeholderData: keepPreviousData
  });

  // Fetch Required Parts Requests (Admin View)
  const { data: requestsData, isLoading: isLoadingRequests, isError: isRequestsError, refetch: refetchRequests } = useQuery({
    queryKey: ['adminRequiredPartsRequests'],
    queryFn: () => requiredPartsAPI.getAll(),
    enabled: activeTab === 'requests'
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: inventoryAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsModalOpen(false);
      resetForm();
      setErrorMessage(null);
    },
    onError: (err) => {
      setErrorMessage(err?.response?.data?.message || 'حدث خطأ أثناء إضافة قطعة الغيار.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsModalOpen(false);
      resetForm();
      setErrorMessage(null);
    },
    onError: (err) => {
      setErrorMessage(err?.response?.data?.message || 'حدث خطأ أثناء تعديل قطعة الغيار.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setItemToDelete(null);
      setErrorMessage(null);
    },
    onError: (err) => {
      if (err?.response?.status === 409) {
        setErrorMessage('لا يمكن حذف قطعة الغيار لأنها مرتبطة بطلبات قطع غيار سابقة أو سجلات صيانة تاريخية.');
      } else {
        setErrorMessage(err?.response?.data?.message || 'حدث خطأ أثناء حذف قطعة الغيار.');
      }
      setItemToDelete(null);
    }
  });

  const approvalMutation = useMutation({
    mutationFn: requiredPartsAPI.updateApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequiredPartsRequests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setErrorMessage(null);
    },
    onError: (err) => {
      setErrorMessage(err?.response?.data?.message || 'حدث خطأ أثناء تحديث حالة طلب القطعة.');
    }
  });

  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setItemToDelete(id);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('5');
  const [price, setPrice] = useState('');

  const resetForm = () => {
    setEditingPart(null);
    setName(''); setPartNumber(''); setBrand(''); setStockQuantity(''); setMinStockLevel('5'); setPrice('');
  };

  const openModal = (part = null) => {
    setErrorMessage(null);
    if (part) {
      setEditingPart(part);
      setName(part.name || '');
      setPartNumber(part.sku !== '-' ? part.sku : '');
      setBrand(part.manufacturer !== 'غير محدد' ? part.manufacturer : '');
      setStockQuantity(part.stock !== undefined ? part.stock.toString() : '');
      setMinStockLevel(part.minStock !== undefined ? part.minStock.toString() : '5');
      setPrice(part.purchasePrice !== undefined ? part.purchasePrice.toString() : '');
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage(null);
    const payload = {
      name,
      part_number: partNumber,
      brand,
      stock_quantity: Number(stockQuantity),
      min_stock_level: Number(minStockLevel),
      price: Number(price)
    };

    if (editingPart) {
      updateMutation.mutate({ id: editingPart.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleApprovalDecision = (requestId, status) => {
    setErrorMessage(null);
    approvalMutation.mutate([{ id: requestId, status }]);
  };

  const inventoryItems = inventoryData?.items || [];
  const requestsList = Array.isArray(requestsData) ? requestsData : [];
  const pendingRequestsCount = requestsList.filter(r => r.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">إدارة المخزون وقطع الغيار</h1>
          <p className="text-slate-500 mt-1 text-sm">مراقبة كميات قطع الغيار، إدارة الأسعار، ومعالجة طلبات الفنيين.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          <span className="material-symbols-outlined text-lg">add_box</span>
          إضافة صنف جديد
        </button>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-bold flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600">error</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-8">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'inventory'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg">inventory_2</span>
          <span>قطع الغيار والمخزون ({inventoryItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg">precision_manufacturing</span>
          <span>طلبات الفنيين</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-xs font-bold animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-[400px]">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input 
                type="text" 
                placeholder="ابحث باسم القطعة، أو رقمها..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
              />
            </div>
          </div>

          {/* Grid */}
          {isLoadingInventory ? (
            <PageLoader />
          ) : isInventoryError ? (
            <div className="p-8 bg-rose-50 text-rose-700 rounded-3xl text-center font-bold text-sm">
              حدث خطأ أثناء تحميل بيانات المخزون: {inventoryError?.message}
            </div>
          ) : inventoryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد نتائج</h3>
              <p className="text-slate-500 text-sm max-w-xs">لم نتمكن من العثور على قطع غيار تطابق بحثك.</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${isFetchingInventory ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {inventoryItems.map(part => {
                const isLowStock = part.status === 'low' || part.status === 'medium';
                return (
                  <div 
                    key={part.id} 
                    onClick={() => setSelectedProduct(part)}
                    className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer transition-all duration-300 group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(part);
                          }}
                          className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(e, part.id)}
                          disabled={deleteMutation.isPending}
                          className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                      <span className="text-xs font-mono font-bold bg-slate-50 text-slate-400 px-3 py-1.5 rounded-lg shadow-sm">
                        {part.sku || `P${part.id}`}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-800 text-lg mb-1">{part.name}</h3>
                    <p className="text-xs text-slate-400 mb-6">{part.category} - {part.manufacturer}</p>

                    <div className="mt-auto grid grid-cols-2 gap-3">
                      <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center ${isLowStock ? 'bg-rose-50 border-rose-100/50' : 'bg-slate-50 border-slate-100/50'}`}>
                        <span className="text-xs text-slate-500 mb-1">الكمية</span>
                        <div className="flex items-center gap-1.5">
                          {isLowStock && <span className="material-symbols-outlined text-rose-500 text-[16px]">warning</span>}
                          <span className={`text-xl font-bold font-mono ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                            {part.stock}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-2xl border border-slate-100/50 bg-slate-50 flex flex-col items-center justify-center">
                        <span className="text-xs text-slate-500 mb-1">السعر</span>
                        <span className="text-xl font-bold font-mono text-primary">
                          {part.purchasePrice} ر.س
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MECHANIC PARTS REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {isLoadingRequests ? (
            <PageLoader />
          ) : isRequestsError ? (
            <div className="p-8 bg-rose-50 text-rose-700 rounded-3xl text-center font-bold text-sm">
              حدث خطأ أثناء تحميل طلبات القطع.
            </div>
          ) : requestsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">precision_manufacturing</span>
              <h3 className="text-lg font-bold text-slate-700">لا توجد طلبات قطع غيار حالية</h3>
              <p className="text-xs text-slate-400 mt-1">سيتم عرض جميع طلبات القطع المقدمة من الفنيين هنا للاعتماد أو الرفض.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">القطعة المطلوبة</th>
                      <th className="py-4 px-6">المكان والسيارة</th>
                      <th className="py-4 px-6">الفني طالب القطعة</th>
                      <th className="py-4 px-6 text-center">الكمية المطلوبة</th>
                      <th className="py-4 px-6 text-center">المخزون المتوفر</th>
                      <th className="py-4 px-6 text-center">الحالة</th>
                      <th className="py-4 px-6 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {requestsList.map((reqItem) => {
                      const isPending = reqItem.status === 'pending';
                      const isApproved = reqItem.status === 'approved';
                      const isRejected = reqItem.status === 'rejected';

                      return (
                        <tr key={reqItem.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Part Info */}
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{reqItem.part_name}</p>
                              <p className="text-xs text-slate-400 font-mono">SKU: {reqItem.sku}</p>
                            </div>
                          </td>

                          {/* Vehicle / Client */}
                          <td className="py-4 px-6 text-xs">
                            <p className="font-bold text-slate-700">{reqItem.vehicle_info}</p>
                            <p className="text-slate-400">العميل: {reqItem.client_name}</p>
                          </td>

                          {/* Mechanic */}
                          <td className="py-4 px-6 text-xs font-bold text-slate-700">
                            {reqItem.mechanic_name}
                          </td>

                          {/* Requested Qty */}
                          <td className="py-4 px-6 text-center font-mono font-bold text-sm text-slate-800">
                            {reqItem.quantity}
                          </td>

                          {/* Current Stock */}
                          <td className="py-4 px-6 text-center font-mono font-bold text-sm">
                            <span className={reqItem.current_stock < reqItem.quantity ? 'text-rose-600' : 'text-emerald-600'}>
                              {reqItem.current_stock}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-6 text-center">
                            {isPending && (
                              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                                قيد الانتظار
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                                معتمد
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold">
                                مرفوض
                              </span>
                            )}
                          </td>

                          {/* Decision Actions */}
                          <td className="py-4 px-6 text-center">
                            {isPending ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleApprovalDecision(reqItem.id, 'approved')}
                                  disabled={approvalMutation.isPending}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  اعتماد
                                </button>
                                <button
                                  onClick={() => handleApprovalDecision(reqItem.id, 'rejected')}
                                  disabled={approvalMutation.isPending}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  رفض
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-bold">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">{editingPart ? 'تعديل صنف' : 'إضافة صنف'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">اسم القطعة</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">رقم القطعة (SKU)</label>
                  <input required value={partNumber} onChange={e => setPartNumber(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">الشركة المصنعة</label>
                  <input required value={brand} onChange={e => setBrand(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">السعر (ر.س)</label>
                  <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono text-left text-slate-800 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">الكمية الحالية</label>
                  <input required type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono text-left text-slate-800 font-bold" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">الحد الأدنى للتنبيه</label>
                  <input type="number" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} placeholder="5" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono text-left text-slate-800 font-bold" />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
              >
                {editingPart ? 'حفظ التعديلات' : 'إضافة الصنف'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من رغبتك في حذف هذا الصنف من المخزون؟ هذا الإجراء لا يمكن التراجع عنه."
        confirmText="حذف الصنف"
        isDanger={true}
      />
    </div>
  );
}
