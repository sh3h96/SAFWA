import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { inventoryAPI } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ProductDetailsModal from '../../components/admin/ProductDetailsModal';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function InventoryPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: inventoryData, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['inventory', debouncedSearch],
    queryFn: () => inventoryAPI.getAll(debouncedSearch),
    placeholderData: keepPreviousData
  });

  const createMutation = useMutation({
    mutationFn: inventoryAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
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
  const [minStockLevel, setMinStockLevel] = useState('');
  const [price, setPrice] = useState('');

  const resetForm = () => {
    setEditingPart(null);
    setName(''); setPartNumber(''); setBrand(''); setStockQuantity(''); setMinStockLevel(''); setPrice('');
  };

  const openModal = (part = null) => {
    if (part) {
      setEditingPart(part);
      setName(part.name);
      setPartNumber(part.sku || '');
      setBrand(part.manufacturer || '');
      setStockQuantity(part.stock || '');
      setMinStockLevel(''); // Backend doesn't return this in list, leave blank or fetch details
      setPrice(part.purchasePrice || '');
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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

  if (isError) return <div className="text-center text-red-500 font-bold py-10">حدث خطأ أثناء تحميل البيانات: {error?.message}</div>;

  const inventoryItems = inventoryData?.items || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Row 1: Header & Primary Action */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">إدارة المخزون</h1>
          <p className="text-slate-500 mt-2 text-sm">مراقبة كميات قطع الغيار وإدارة الأسعار وتنبيهات النواقص.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          <span className="material-symbols-outlined text-lg">add_box</span>
          إضافة صنف جديد
        </button>
      </div>

      {/* Row 2: Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        {/* Search Bar */}
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
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm font-bold animate-pulse">جاري تحميل المخزون...</p>
        </div>
      ) : inventoryItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center mt-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد نتائج</h3>
          <p className="text-slate-500 text-sm max-w-xs">لم نتمكن من العثور على قطع غيار تطابق بحثك.</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
                    className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
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
                    {part.purchasePrice}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
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
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100"><span className="material-symbols-outlined text-sm">close</span></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">اسم القطعة</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">رقم القطعة (SKU)</label>
                  <input required value={partNumber} onChange={e => setPartNumber(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">الشركة المصنعة</label>
                  <input required value={brand} onChange={e => setBrand(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">السعر (ر.س)</label>
                  <input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono text-left" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">الكمية الحالية</label>
                  <input required type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono text-left" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">الحد الأدنى للتنبيه</label>
                  <input type="number" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} placeholder="اختياري عند التعديل" className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono text-left" />
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
