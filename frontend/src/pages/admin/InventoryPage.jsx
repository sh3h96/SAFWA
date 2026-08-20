import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { inventoryAPI, requiredPartsAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import ProductDetailsModal from '../../components/admin/ProductDetailsModal';
import UserDetailsModal from '../../components/admin/UserDetailsModal';
import VehicleDetailsModal from '../../components/admin/VehicleDetailsModal';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function InventoryPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'requests'

  // Tab 1: Inventory Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Tab 2: Requests Filters
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [errorMessage, setErrorMessage] = useState(null);
  const [successBanner, setSuccessBanner] = useState('');

  // Modals state for Entity Interactions
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  // Modal State for Add / Edit Part
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  // Modal State for Part Delete Confirmation
  const [partToDelete, setPartToDelete] = useState(null);

  // Modal State for Request Rejection Confirmation
  const [requestToReject, setRequestToReject] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('5');
  const [price, setPrice] = useState('');

  // Debounce inventory search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Inventory Parts
  const {
    data: inventoryData,
    isLoading: isLoadingInventory,
    isFetching: isFetchingInventory,
    isError: isInventoryError,
    error: inventoryError
  } = useQuery({
    queryKey: ['inventory', debouncedSearch],
    queryFn: () => inventoryAPI.getAll(debouncedSearch),
    placeholderData: keepPreviousData
  });

  // Fetch Required Parts Requests (Admin View)
  const {
    data: requestsData,
    isLoading: isLoadingRequests,
    isFetching: isFetchingRequests,
    isError: isRequestsError
  } = useQuery({
    queryKey: ['adminRequiredPartsRequests'],
    queryFn: () => requiredPartsAPI.getAll(),
    enabled: activeTab === 'requests'
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: inventoryAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['adminRequiredPartsRequests'] });
      setIsFormModalOpen(false);
      resetForm();
      setErrorMessage(null);
      showSuccess('تمت إضافة قطعة الغيار بنجاح إلى المخزون.');
    },
    onError: (err) => {
      setErrorMessage(err?.response?.data?.message || 'حدث خطأ أثناء إضافة قطعة الغيار.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['adminRequiredPartsRequests'] });
      setIsFormModalOpen(false);
      resetForm();
      setErrorMessage(null);
      showSuccess('تم تحديث بيانات قطعة الغيار ومستوى المخزون بنجاح.');
    },
    onError: (err) => {
      setErrorMessage(err?.response?.data?.message || 'حدث خطأ أثناء تعديل قطعة الغيار.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['adminRequiredPartsRequests'] });
      setPartToDelete(null);
      setErrorMessage(null);
      showSuccess('تم حذف قطعة الغيار بنجاح من المخزون.');
    },
    onError: (err) => {
      if (err?.response?.status === 409) {
        setErrorMessage('لا يمكن حذف قطعة الغيار لأنها مرتبطة بطلبات قطع غيار سابقة أو سجلات صيانة تاريخية.');
      } else {
        setErrorMessage(err?.response?.data?.message || 'حدث خطأ أثناء حذف قطعة الغيار.');
      }
      setPartToDelete(null);
    }
  });

  const approvalMutation = useMutation({
    mutationFn: requiredPartsAPI.updateApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequiredPartsRequests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setErrorMessage(null);
      setRequestToReject(null);
      showSuccess('تم تحديث حالة طلب قطعة الغيار بنجاح.');
    },
    onError: (err) => {
      setErrorMessage(err?.response?.data?.message || 'حدث خطأ أثناء تحديث حالة طلب القطعة.');
      setRequestToReject(null);
    }
  });

  const showSuccess = (msg) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(''), 4000);
  };

  const resetForm = () => {
    setEditingPart(null);
    setName(''); setPartNumber(''); setBrand(''); setStockQuantity(''); setMinStockLevel('5'); setPrice('');
  };

  const openFormModal = (part = null) => {
    setErrorMessage(null);
    if (part) {
      setEditingPart(part);
      setName(part.name || '');
      setPartNumber(part.sku && part.sku !== '-' ? part.sku : (part.part_number || ''));
      setBrand(part.manufacturer && part.manufacturer !== 'غير محدد' ? part.manufacturer : (part.brand || ''));
      setStockQuantity(part.stock !== undefined ? part.stock.toString() : (part.stock_quantity !== undefined ? part.stock_quantity.toString() : (part.current_stock !== undefined ? part.current_stock.toString() : '0')));
      setMinStockLevel(part.minStock !== undefined ? part.minStock.toString() : (part.min_stock_level !== undefined ? part.min_stock_level.toString() : '5'));
      setPrice(part.purchasePrice !== undefined ? part.purchasePrice.toString() : (part.price !== undefined ? part.price.toString() : (part.unit_price !== undefined ? part.unit_price.toString() : '0')));
    } else {
      resetForm();
    }
    setIsFormModalOpen(true);
  };

  const handleSubmitForm = (e) => {
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
    if (status === 'rejected') {
      const targetReq = requestsList.find(r => r.id === requestId);
      setRequestToReject(targetReq || { id: requestId });
    } else {
      approvalMutation.mutate([{ id: requestId, status }]);
    }
  };

  const confirmRejection = () => {
    if (requestToReject) {
      approvalMutation.mutate([{ id: requestToReject.id, status: 'rejected' }]);
    }
  };

  const clearRequestFilters = () => {
    setRequestSearchTerm('');
    setRequestStatusFilter('all');
    setFromDate('');
    setToDate('');
  };

  const inventoryItems = inventoryData?.items || [];
  const requestsList = useMemo(() => Array.isArray(requestsData) ? requestsData : [], [requestsData]);

  // Combined Filtering Pipeline for Technician Requests (Pure Business Statuses: pending, approved, installed, rejected)
  const filteredRequests = useMemo(() => {
    return requestsList.filter((reqItem) => {
      // 1. Search Filter (part name, sku, vehicle_info, client_name, mechanic_name)
      if (requestSearchTerm) {
        const term = requestSearchTerm.toLowerCase().trim();
        const matchPart = reqItem.part_name?.toLowerCase().includes(term);
        const matchSku = reqItem.sku?.toLowerCase().includes(term);
        const matchVehicle = reqItem.vehicle_info?.toLowerCase().includes(term);
        const matchClient = reqItem.client_name?.toLowerCase().includes(term);
        const matchMechanic = reqItem.mechanic_name?.toLowerCase().includes(term);
        if (!matchPart && !matchSku && !matchVehicle && !matchClient && !matchMechanic) {
          return false;
        }
      }

      // 2. Status Filter
      if (requestStatusFilter && requestStatusFilter !== 'all') {
        if (reqItem.status !== requestStatusFilter) {
          return false;
        }
      }

      // 3. Date From Filter
      if (fromDate) {
        const reqDate = new Date(reqItem.created_at || reqItem.createdAt);
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (reqDate < from) return false;
      }

      // 4. Date To Filter
      if (toDate) {
        const reqDate = new Date(reqItem.created_at || reqItem.createdAt);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (reqDate > to) return false;
      }

      return true;
    });
  }, [requestsList, requestSearchTerm, requestStatusFilter, fromDate, toDate]);

  const pendingRequestsCount = useMemo(() => {
    return requestsList.filter(r => r.status === 'pending').length;
  }, [requestsList]);

  const isAnyRequestFilterActive = Boolean(requestSearchTerm || (requestStatusFilter && requestStatusFilter !== 'all') || fromDate || toDate);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">إدارة المخزون وقطع الغيار</h1>
          <p className="text-slate-500 mt-1 text-sm">مراقبة الكميات والمستويات الحرجة، ومتابعة طلبات الفنيين.</p>
        </div>
        <button
          onClick={() => openFormModal()}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:shadow-lg transition-all duration-300 shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add_box</span>
          إضافة صنف جديد
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-emerald-600">check_circle</span>
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner('')} className="text-emerald-500 hover:text-emerald-700">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-rose-600">error</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex border-b border-slate-200 gap-8">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'inventory'
              ? 'border-teal-600 text-teal-800'
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
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg">precision_manufacturing</span>
          <span>طلبات الفنيين</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-xs font-bold animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: INVENTORY MANAGEMENT                          */}
      {/* ==================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="relative w-full md:w-[420px]">
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                placeholder="ابحث باسم القطعة، رقم SKU، الشركة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">إجمالي الأصناف: <span className="font-mono text-teal-800 text-sm">{inventoryItems.length}</span></span>
            </div>
          </div>

          {/* Grid Layout of Redesigned Inventory Cards */}
          {isLoadingInventory ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
              <p className="text-sm font-bold animate-pulse">جاري تحميل عناصر المخزون...</p>
            </div>
          ) : isInventoryError ? (
            <div className="p-8 bg-rose-50 text-rose-700 rounded-3xl text-center font-bold text-sm border border-rose-200">
              حدث خطأ أثناء تحميل بيانات المخزون: {inventoryError?.message}
            </div>
          ) : inventoryItems.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon="inventory_2"
                title="لا توجد نتائج مطابقة"
                message={searchTerm ? "لم نتمكن من العثور على قطع غيار تطابق بحثك." : "لم يتم تسجيل أي قطع غيار في المخزون بعد."}
                actionLabel={searchTerm ? "مسح البحث" : null}
                onAction={() => setSearchTerm('')}
              />
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${isFetchingInventory ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {inventoryItems.map(part => {
                const stock = part.stock !== undefined ? part.stock : (part.stock_quantity ?? 0);
                const minStock = part.minStock !== undefined ? part.minStock : (part.min_stock_level ?? 5);
                const isLowStock = stock <= minStock;
                const priceVal = part.purchasePrice !== undefined ? part.purchasePrice : (part.price ? parseFloat(part.price) : 0);
                const mfgName = part.manufacturer || part.brand || 'غير محدد';

                return (
                  <div
                    key={part.id}
                    onClick={() => setSelectedProduct(part)}
                    className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg cursor-pointer transition-all duration-300 group flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
                  >
                    {/* Header: Icon/Image + Name + SKU + Isolated Fixed Actions */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">

                        {/* Info Block */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {part.image ? (
                            <img src={part.image} alt={part.name} className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-100 group-hover:scale-105 transition-transform shrink-0">
                              <span className="material-symbols-outlined text-xl">inventory_2</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="px-2.5 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-mono font-bold tracking-wider inline-block">
                              {part.sku || `P${part.id}`}
                            </span>
                            <p
                              className="text-[11px] text-slate-400 font-bold mt-0.5 truncate block"
                              title={mfgName}
                            >
                              {mfgName}
                            </p>
                          </div>
                        </div>

                        {/* Dedicated Independent Action Group */}
                        <div className="flex items-center gap-1 shrink-0 bg-slate-50/80 p-1 rounded-xl border border-slate-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openFormModal(part);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-700 hover:bg-white hover:shadow-sm transition-all"
                            title="تعديل القطعة والمخزون"
                          >
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPartToDelete(part);
                              setErrorMessage(null);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm transition-all"
                            title="حذف القطعة"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>

                      </div>

                      {/* Part Name */}
                      <h3 className="font-bold text-slate-800 text-base group-hover:text-teal-800 transition-colors line-clamp-1">
                        {part.name}
                      </h3>
                    </div>

                    {/* Compact Specs Grid */}
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">

                      {/* Price Box */}
                      <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-bold block">السعر (الوحدة)</span>
                        <span className="font-bold text-teal-700 font-mono text-sm block">
                          {formatCurrency(priceVal, 'ر.ي')}
                        </span>
                      </div>

                      {/* Stock Box with Low-Stock Alert Badge */}
                      <div className={`p-3 rounded-2xl border space-y-0.5 ${isLowStock ? 'bg-rose-50/80 border-rose-100' : 'bg-slate-50/80 border-slate-100'}`}>
                        <span className={`text-[10px] font-bold block ${isLowStock ? 'text-rose-600' : 'text-slate-400'}`}>
                          {isLowStock ? 'مخزون منخفض' : 'الكمية'}
                        </span>
                        <div className="flex items-center gap-1">
                          {isLowStock && <span className="material-symbols-outlined text-rose-500 text-sm shrink-0">warning</span>}
                          <span className={`font-bold font-mono text-sm ${isLowStock ? 'text-rose-700' : 'text-slate-800'}`}>
                            {stock}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">قطعة</span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: TECHNICIAN PARTS REQUESTS                     */}
      {/* ==================================================== */}
      {activeTab === 'requests' && (
        <div className="space-y-6">

          {/* Combined Filters Toolbar for Technician Requests */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">

              {/* 1. Live Search Input */}
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="ابحث باسم القطعة، SKU، اسم السيارة، العميل، أو الفني..."
                  value={requestSearchTerm}
                  onChange={(e) => setRequestSearchTerm(e.target.value)}
                  className="w-full pr-12 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                />
                {requestSearchTerm && (
                  <button onClick={() => setRequestSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                )}
              </div>

              {/* 2. Status & Date Range Controls */}
              <div className="flex flex-wrap items-center gap-3 text-xs">

                {/* Status Dropdown (Pure Business Statuses Only) */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                  <span className="text-slate-400 font-bold text-[11px]">الحالة:</span>
                  <select
                    value={requestStatusFilter}
                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                    className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer text-xs"
                  >
                    <option value="all">الكل</option>
                    <option value="pending">قيد الانتظار</option>
                    <option value="approved">معتمد</option>
                    <option value="installed">تم التركيب</option>
                    <option value="rejected">مرفوض</option>
                  </select>
                </div>

                {/* Date From */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                  <span className="text-slate-400 font-bold text-[11px]">من:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer text-xs"
                  />
                </div>

                {/* Date To */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
                  <span className="text-slate-400 font-bold text-[11px]">إلى:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer text-xs"
                  />
                </div>

                {/* Clear Filters Button */}
                {isAnyRequestFilterActive && (
                  <button
                    onClick={clearRequestFilters}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1 border border-rose-200/60"
                    title="مسح جميع الفلاتر"
                  >
                    <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                    <span>مسح الفلاتر</span>
                  </button>
                )}
              </div>

            </div>

            {/* Stats Summary line */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div>
                عرض <span className="font-bold text-slate-800 font-mono">{filteredRequests.length}</span> من أصل <span className="font-bold text-slate-800 font-mono">{requestsList.length}</span> طلب
              </div>
            </div>
          </div>

          {isLoadingRequests ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
              <p className="text-sm font-bold animate-pulse">جاري تحميل طلبات قطع الغيار...</p>
            </div>
          ) : isRequestsError ? (
            <div className="p-8 bg-rose-50 text-rose-700 rounded-3xl text-center font-bold text-sm border border-rose-200">
              حدث خطأ أثناء تحميل طلبات القطع من السيرفر.
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon="precision_manufacturing"
                title="لا توجد طلبات تطابق معايير البحث"
                message={isAnyRequestFilterActive ? "لم نتمكن من العثور على أي طلبات قطع غيار تطابق الفلاتر المحددة." : "سيتم عرض جميع طلبات قطع الغيار المقدّمة من الفنيين هنا لمراجعتها واعتمادها بالبيانات الحقيقية."}
                actionLabel={isAnyRequestFilterActive ? "مسح الفلاتر" : null}
                onAction={clearRequestFilters}
              />
            </div>
          ) : (
            <div className={`bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-opacity duration-300 ${isFetchingRequests ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">القطعة المطلوبة</th>
                      <th className="py-4 px-6">المركبة والمالك</th>
                      <th className="py-4 px-6">الفني طالب القطعة</th>
                      <th className="py-4 px-6 text-center">الكمية المطلوبة</th>
                      <th className="py-4 px-6 text-center">المخزون الحالي</th>
                      <th className="py-4 px-6 text-center">الحالة والتنبيهات</th>
                      <th className="py-4 px-6 text-center">الإجراء والاعتماد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredRequests.map((reqItem) => {
                      const isPending = reqItem.status === 'pending';
                      const isApproved = reqItem.status === 'approved';
                      const isRejected = reqItem.status === 'rejected';
                      const isInstalled = reqItem.status === 'installed';

                      const currentStock = reqItem.current_stock ?? 0;
                      const requestedQty = reqItem.quantity ?? 1;
                      const isStockInsufficient = currentStock < requestedQty;

                      return (
                        <tr key={reqItem.id} className="hover:bg-slate-50/50 transition-colors">

                          {/* 1. Interactive Part Link */}
                          <td className="py-4 px-6">
                            <div
                              onClick={() => setSelectedProduct(reqItem.part || { id: reqItem.part_id, name: reqItem.part_name, sku: reqItem.sku, purchasePrice: reqItem.unit_price, stock: reqItem.current_stock })}
                              className="cursor-pointer group p-1 -m-1 rounded-xl hover:bg-teal-50/40 transition-all inline-block"
                              title="انقر لعرض تفاصيل قطعة الغيار"
                            >
                              <p className="font-bold text-slate-800 text-sm group-hover:text-teal-800 flex items-center gap-1 transition-colors">
                                {reqItem.part_name}
                                <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity">open_in_new</span>
                              </p>
                              <span className="text-xs text-slate-400 font-mono block mt-0.5">SKU: {reqItem.sku}</span>
                            </div>
                          </td>

                          {/* 2. Interactive Vehicle & Customer Link */}
                          <td className="py-4 px-6 text-xs space-y-1">
                            {/* Vehicle */}
                            {reqItem.vehicle_id ? (
                              <div
                                onClick={() => setSelectedVehicleId(reqItem.vehicle_id)}
                                className="cursor-pointer group inline-flex items-center gap-1 hover:text-teal-800 transition-colors"
                                title="انقر لعرض تفاصيل المركبة"
                              >
                                <span className="font-bold text-slate-800 group-hover:text-teal-800">{reqItem.vehicle_info}</span>
                                <span className="material-symbols-outlined text-[11px] opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity">open_in_new</span>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-700">{reqItem.vehicle_info}</span>
                            )}

                            {/* Customer */}
                            <div>
                              {reqItem.client_id ? (
                                <button
                                  onClick={() => setSelectedUserId(reqItem.client_id)}
                                  className="text-slate-400 hover:text-teal-700 font-semibold inline-flex items-center gap-1 transition-colors group"
                                  title="عرض ملف العميل"
                                >
                                  <span>العميل: {reqItem.client_name}</span>
                                  <span className="material-symbols-outlined text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                                </button>
                              ) : (
                                <span className="text-slate-400">العميل: {reqItem.client_name}</span>
                              )}
                            </div>
                          </td>

                          {/* 3. Interactive Technician Link */}
                          <td className="py-4 px-6 text-xs">
                            {reqItem.mechanics && reqItem.mechanics.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1">
                                {reqItem.mechanics.map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => setSelectedUserId(m.id)}
                                    className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 px-2 py-0.5 rounded-lg text-xs font-bold text-slate-700 hover:text-teal-800 transition-all group"
                                    title="عرض ملف الفني"
                                  >
                                    <span className="material-symbols-outlined text-[12px] text-slate-400 group-hover:text-teal-600">engineering</span>
                                    {m.name}
                                    <span className="material-symbols-outlined text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                                  </button>
                                ))}
                              </div>
                            ) : reqItem.mechanic_id ? (
                              <button
                                onClick={() => setSelectedUserId(reqItem.mechanic_id)}
                                className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 px-2 py-0.5 rounded-lg text-xs font-bold text-slate-700 hover:text-teal-800 transition-all group"
                                title="عرض ملف الفني"
                              >
                                <span className="material-symbols-outlined text-[12px] text-slate-400 group-hover:text-teal-600">engineering</span>
                                {reqItem.mechanic_name}
                                <span className="material-symbols-outlined text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                              </button>
                            ) : (
                              <span className="font-bold text-slate-700">{reqItem.mechanic_name}</span>
                            )}
                          </td>

                          {/* 4. Requested Quantity */}
                          <td className="py-4 px-6 text-center font-mono font-bold text-sm text-slate-800">
                            {requestedQty}
                          </td>

                          {/* 5. Current Stock */}
                          <td className="py-4 px-6 text-center font-mono font-bold text-sm">
                            <span className={isStockInsufficient ? 'text-rose-600 font-extrabold' : 'text-emerald-700'}>
                              {currentStock}
                            </span>
                          </td>

                          {/* 6. Refined Status Badge & Insufficient Stock Alert System */}
                          <td className="py-4 px-6 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              {isPending && (
                                <span className="px-3.5 py-1.5 bg-amber-50/90 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                  قيد الانتظار
                                </span>
                              )}
                              {isApproved && (
                                <span className="px-3.5 py-1.5 bg-emerald-50/90 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                  <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                                  معتمد
                                </span>
                              )}
                              {isInstalled && (
                                <span className="px-3.5 py-1.5 bg-teal-50/90 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                  <span className="material-symbols-outlined text-[15px] text-teal-600">build</span>
                                  تم التركيب
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-3.5 py-1.5 bg-rose-50/90 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                  <span className="material-symbols-outlined text-[15px] text-rose-600">cancel</span>
                                  مرفوض
                                </span>
                              )}

                              {/* Prominent Insufficient Stock Alert Banner for Pending Requests */}
                              {isPending && isStockInsufficient && (
                                <span
                                  className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 animate-in fade-in"
                                  title={`المخزون الحالي (${currentStock}) أقل من المطلوب (${requestedQty})`}
                                >
                                  <span className="material-symbols-outlined text-[13px] text-rose-500">warning</span>
                                  <span>المخزون غير كافٍ — المتوفر: {currentStock}، المطلوب: {requestedQty}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 7. Action Column: Approve / Update Stock / Install / Reject */}
                          <td className="py-4 px-6 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-2">

                              {/* Option A: Pending State Actions */}
                              {isPending && (
                                <>
                                  {/* Direct Shortcut to Edit Part Stock if Stock is Insufficient */}
                                  {isStockInsufficient && (
                                    <button
                                      onClick={() => openFormModal(reqItem.part || {
                                        id: reqItem.part_id,
                                        name: reqItem.part_name,
                                        sku: reqItem.sku,
                                        purchasePrice: reqItem.unit_price,
                                        stock: reqItem.current_stock,
                                        minStock: 5
                                      })}
                                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm shadow-amber-500/20"
                                      title="فتح شاشة تعديل قطعة الغيار وتحديث الكمية بالمخزون"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">edit_square</span>
                                      <span>تحديث المخزون</span>
                                    </button>
                                  )}

                                  {/* Approve Button (Disabled if Stock Insufficient) */}
                                  <button
                                    onClick={() => handleApprovalDecision(reqItem.id, 'approved')}
                                    disabled={approvalMutation.isPending || isStockInsufficient}
                                    className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                                      isStockInsufficient
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                                        : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
                                    }`}
                                    title={isStockInsufficient ? `لا يمكن الاعتماد: المخزون الحالي (${currentStock}) أقل من المطلوب (${requestedQty})، يرجى تحديث المخزون أولاً.` : 'اعتماد الطلب وخصم الكمية المطلوبة من المخزون'}
                                  >
                                    {approvalMutation.isPending && approvalMutation.variables?.[0]?.id === reqItem.id && approvalMutation.variables?.[0]?.status === 'approved' ? (
                                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                    )}
                                    <span>اعتماد</span>
                                  </button>

                                  {/* Reject Button */}
                                  <button
                                    onClick={() => handleApprovalDecision(reqItem.id, 'rejected')}
                                    disabled={approvalMutation.isPending}
                                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    title="رفض طلب قطعة الغيار"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                                    <span>رفض</span>
                                  </button>
                                </>
                              )}

                              {/* Option B: Approved State Actions (Mark Installed or Reject & Restore Stock) */}
                              {isApproved && (
                                <>
                                  <button
                                    onClick={() => handleApprovalDecision(reqItem.id, 'installed')}
                                    disabled={approvalMutation.isPending}
                                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-teal-700/20"
                                    title="تأكيد تركيب القطعة بالمركبة (لا يخصم المخزون مرة ثانية)"
                                  >
                                    {approvalMutation.isPending && approvalMutation.variables?.[0]?.id === reqItem.id && approvalMutation.variables?.[0]?.status === 'installed' ? (
                                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <span className="material-symbols-outlined text-[16px]">build</span>
                                    )}
                                    <span>تركيب القطعة</span>
                                  </button>

                                  <button
                                    onClick={() => handleApprovalDecision(reqItem.id, 'rejected')}
                                    disabled={approvalMutation.isPending}
                                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                    title="إلغاء اعتماد الطلب وإعادة الكمية المحجوزة للمخزون"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">undo</span>
                                    <span>إلغاء الاعتماد</span>
                                  </button>
                                </>
                              )}

                              {/* Option C: Final States (Installed or Rejected) */}
                              {(isInstalled || isRejected) && (
                                <span className="text-xs text-slate-400 font-bold">-</span>
                              )}

                            </div>
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

      {/* ---------------------------------------------------- */}
      {/* 1. ADD / EDIT PART MODAL                             */}
      {/* ---------------------------------------------------- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !createMutation.isPending && !updateMutation.isPending && setIsFormModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">

            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                  <span className="material-symbols-outlined text-xl">{editingPart ? 'edit_note' : 'add_box'}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800">{editingPart ? `تعديل مخزون / بيانات القطعة: ${editingPart.name || editingPart.part_name || ''}` : 'إضافة صنف جديد للمخزون'}</h2>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-slate-600">اسم القطعة <span className="text-rose-500">*</span></label>
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثال: فحمات فرامل أمامية"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">رقم القطعة (SKU)</label>
                  <input
                    value={partNumber}
                    onChange={e => setPartNumber(e.target.value)}
                    placeholder="SKU12345"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">الشركة المصنعة</label>
                  <input
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="تويوتا / بوش"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">السعر (ر.ي) <span className="text-rose-500">*</span></label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="1500"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-teal-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">الكمية المتوفرة بالمخزون <span className="text-rose-500">*</span></label>
                  <input
                    required
                    type="number"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-sm font-mono font-bold text-amber-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-slate-600">الحد الأدنى للتنبيه (Min Stock)</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={e => setMinStockLevel(e.target.value)}
                    placeholder="5"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري حفظ المخزون...</span>
                    </>
                  ) : (
                    editingPart ? 'حفظ وتحديث المخزون' : 'إضافة الصنف'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. PART DELETE CONFIRMATION MODAL                    */}
      {/* ---------------------------------------------------- */}
      {partToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !deleteMutation.isPending && setPartToDelete(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <span className="material-symbols-outlined text-2xl text-rose-600">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">تأكيد حذف القطعة</h3>
                <p className="text-xs text-slate-500 mt-0.5">هل أنت متأكد من حذف هذه القطعة؟ لا يمكن التراجع عن هذا الإجراء.</p>
              </div>
            </div>

            {/* Part Specs Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">اسم القطعة:</span>
                <span className="font-bold text-slate-800">{partToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">رقم القطعة (SKU):</span>
                <span className="font-bold text-slate-800 font-mono bg-slate-900 text-white px-2 py-0.5 rounded-md">{partToDelete.sku || partToDelete.part_number || `P${partToDelete.id}`}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">السعر الحالي:</span>
                <span className="font-bold text-teal-700 font-mono">{formatCurrency(partToDelete.purchasePrice || partToDelete.price || 0, 'ر.ي')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(partToDelete.id)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {deleteMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  'حذف القطعة'
                )}
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => setPartToDelete(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. REQUEST REJECTION CONFIRMATION MODAL              */}
      {/* ---------------------------------------------------- */}
      {requestToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !approvalMutation.isPending && setRequestToReject(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <span className="material-symbols-outlined text-2xl text-rose-600">cancel</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">تأكيد رفض طلب قطعة الغيار</h3>
                <p className="text-xs text-slate-500 mt-0.5">هل أنت متأكد من رفض هذا الطلب المقدم من الفني؟</p>
              </div>
            </div>

            {/* Request Summary Card */}
            {requestToReject.part_name && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">القطعة:</span>
                  <span className="font-bold text-slate-800">{requestToReject.part_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">الكمية المطلوبة:</span>
                  <span className="font-bold text-slate-800 font-mono">{requestToReject.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">السيارة:</span>
                  <span className="font-bold text-slate-700">{requestToReject.vehicle_info}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                disabled={approvalMutation.isPending}
                onClick={confirmRejection}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {approvalMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري المعالجة...</span>
                  </>
                ) : (
                  'رفض الطلب'
                )}
              </button>
              <button
                disabled={approvalMutation.isPending}
                onClick={() => setRequestToReject(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. REUSED ENTITY MODALS                              */}
      {/* ---------------------------------------------------- */}

      {/* Part / Product Details Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* User Details Modal (Customer & Technician) */}
      {selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* Vehicle Details Modal */}
      {selectedVehicleId && (
        <VehicleDetailsModal
          vehicleId={selectedVehicleId}
          onClose={() => setSelectedVehicleId(null)}
        />
      )}

    </div>
  );
}
