import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { vehiclesAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import UserDetailsModal from '../../components/admin/UserDetailsModal';
import VehicleDetailsModal from '../../components/admin/VehicleDetailsModal';
import EntityImage from '../../components/common/EntityImage';

export default function AdminVehiclesPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Search & Filter & Sort & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter state
  const [makeFilter, setMakeFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Modals state
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedVehicleModal, setSelectedVehicleModal] = useState(null);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState(null);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page to 1 when filters or sort change
  const handleMakeChange = (e) => { setMakeFilter(e.target.value); setPage(1); };
  const handleModelChange = (e) => { setModelFilter(e.target.value); setPage(1); };
  const handleYearChange = (e) => { setYearFilter(e.target.value); setPage(1); };
  const handleSortByChange = (e) => { setSortBy(e.target.value); setPage(1); };
  const handleSortOrderToggle = () => { setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); setPage(1); };

  // Fetch Vehicles
  const { data: responseData, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['vehicles', { search: debouncedSearch, page, limit, sortBy, sortOrder, make: makeFilter, model: modelFilter, year: yearFilter }],
    queryFn: () => vehiclesAPI.getAll({
      search: debouncedSearch,
      page,
      limit,
      sortBy,
      sortOrder,
      make: makeFilter || undefined,
      model: modelFilter || undefined,
      year: yearFilter || undefined,
    }),
    placeholderData: keepPreviousData,
  });

  // Extract list and pagination
  const vehicles = Array.isArray(responseData) ? responseData : (responseData?.data || []);
  const pagination = responseData?.pagination || { page: 1, limit: 10, total: vehicles.length, totalPages: 1 };

  // Fetch Vehicle History
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['vehicleHistory', selectedVehicleForHistory?.id],
    queryFn: () => vehiclesAPI.getHistory(selectedVehicleForHistory.id),
    enabled: !!selectedVehicleForHistory?.id,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => vehiclesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteSuccessMessage('تم حذف المركبة بنجاح من النظام.');
      setTimeout(() => setDeleteSuccessMessage(''), 4000);
      setVehicleToDelete(null);
      setDeleteErrorMessage('');
    },
    onError: (err) => {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message;

      if (status === 409) {
        setDeleteErrorMessage('لا يمكن حذف هذه المركبة لأنها تحتوي على سجلات صيانة أو مواعيد تاريخية مرتبطة بها.');
      } else if (status === 403) {
        setDeleteErrorMessage('غير مسموح لك بحذف هذه المركبة.');
      } else if (status === 404) {
        setDeleteErrorMessage('المركبة غير موجودة أو تم حذفها بالفعل.');
      } else {
        setDeleteErrorMessage(serverMsg || 'حدث خطأ غير متوقع أثناء محاولة حذف المركبة.');
      }
    }
  });

  const handleDeleteConfirm = () => {
    if (!vehicleToDelete) return;
    setDeleteErrorMessage('');
    deleteMutation.mutate(vehicleToDelete.id);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setMakeFilter('');
    setModelFilter('');
    setYearFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <ErrorState
          title="حدث خطأ في تحميل قائمة المركبات"
          message={getErrorMessage(error)}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['vehicles'] })}
        />
      </div>
    );
  }

  const isUserAuthorizedToDelete = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">إدارة المركبات</h1>
          <p className="text-slate-500 mt-1 text-sm">عرض المركبات المسجلة، تفاصيل المالك، وسجلات الصيانة الفنية تفاعلياً بالبيانات الحقيقية.</p>
        </div>
        <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
            <span className="material-symbols-outlined text-lg">directions_car</span>
          </div>
          <span className="text-sm font-bold text-slate-700">إجمالي المركبات: <span className="font-mono text-teal-800 font-bold">{pagination.total || vehicles.length}</span></span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {deleteSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-emerald-600">check_circle</span>
            <span>{deleteSuccessMessage}</span>
          </div>
          <button onClick={() => setDeleteSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">

          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="ابحث برقم اللوحة، الماركة، الموديل، VIN، اسم المالك، الهاتف..."
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

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">الماركة:</span>
              <input
                type="text"
                placeholder="كل الماركات"
                value={makeFilter}
                onChange={handleMakeChange}
                className="w-28 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">الموديل:</span>
              <input
                type="text"
                placeholder="كل الموديلات"
                value={modelFilter}
                onChange={handleModelChange}
                className="w-28 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">السنة:</span>
              <input
                type="text"
                placeholder="الكل"
                value={yearFilter}
                onChange={handleYearChange}
                className="w-16 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400 font-mono"
              />
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={handleSortByChange}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-teal-300 transition-colors"
            >
              <option value="created_at">تاريخ الإضافة</option>
              <option value="make">الماركة</option>
              <option value="model">الموديل</option>
              <option value="year">السنة</option>
              <option value="license_plate">رقم اللوحة</option>
            </select>

            <button
              onClick={handleSortOrderToggle}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors flex items-center justify-center"
              title={sortOrder === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}
            >
              <span className="material-symbols-outlined text-lg">
                {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
              </span>
            </button>

            {(searchTerm || makeFilter || modelFilter || yearFilter || sortBy !== 'created_at') && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">restart_alt</span>
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Vehicles Table / Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          <p className="text-sm font-bold animate-pulse">جاري تحميل قائمة المركبات...</p>
        </div>
      ) : (
        <div className={`bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-opacity duration-300 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {vehicles.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon="directions_car_filled"
                title="لا توجد مركبات مطابقة"
                message={searchTerm || makeFilter || modelFilter || yearFilter ? "لم يتم العثور على نتائج تطابق فلاتر البحث والفرز المختارة." : "لم يتم تسجيل أي مركبات في النظام بعد."}
                actionLabel={(searchTerm || makeFilter || modelFilter || yearFilter) ? "مسح جميع الفلاتر" : null}
                onAction={handleClearFilters}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">المركبة</th>
                    <th className="py-4 px-6">رقم اللوحة</th>
                    <th className="py-4 px-6">رقم الهيكل (VIN)</th>
                    <th className="py-4 px-6">المالك (Owner)</th>
                    <th className="py-4 px-6">تاريخ الإضافة</th>
                    <th className="py-4 px-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">

                      {/* Interactive Vehicle Make & Model */}
                      <td className="py-4 px-6">
                        <div
                          onClick={() => setSelectedVehicleModal(v)}
                          className="flex items-center gap-3 cursor-pointer group p-1 -m-1 rounded-xl hover:bg-teal-50/40 transition-all"
                          title="انقر لعرض تفاصيل المركبة"
                        >
                          <EntityImage
                            src={v.image_url || v.image || v.imageUrl}
                            type="vehicle"
                            name={`${v.make} ${v.model}`}
                            className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-100/60 group-hover:scale-105 transition-transform"
                          />
                          <div>
                            <p className="font-bold text-slate-800 group-hover:text-teal-800 flex items-center gap-1 transition-colors">
                              {v.make} {v.model}
                              <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity">open_in_new</span>
                            </p>
                            <span className="text-xs font-semibold text-slate-400 font-mono">سنة الصنع: {v.year || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* License Plate */}
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-mono font-bold tracking-wider shadow-inner">
                          {v.license_plate || v.plateNumber || '---'}
                        </span>
                      </td>

                      {/* VIN (Formatted or 'غير مسجل') */}
                      <td className="py-4 px-6">
                        <span className={`text-xs font-mono font-bold truncate block max-w-[150px] ${v.vin && v.vin !== 'null' ? 'text-slate-700' : 'text-slate-400 italic font-sans'}`}>
                          {v.vin && v.vin !== 'null' ? v.vin : 'غير مسجل'}
                        </span>
                      </td>

                      {/* Interactive Owner Info */}
                      <td className="py-4 px-6">
                        {v.owner ? (
                          <div
                            onClick={() => (v.owner?.id || v.client_id) && setSelectedUserId(v.owner?.id || v.client_id)}
                            className="cursor-pointer group p-1 -m-1 rounded-xl hover:bg-teal-50/40 transition-all"
                            title="انقر لعرض الملف الشخصي للمالك"
                          >
                            <p className="font-bold text-slate-800 text-xs group-hover:text-teal-800 flex items-center gap-1 transition-colors">
                              {v.owner.name || 'غير معروف'}
                              <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity">open_in_new</span>
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{v.owner.phone || v.owner.email || ''}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">غير متوفر</span>
                        )}
                      </td>

                      {/* Added Date */}
                      <td className="py-4 px-6 text-xs text-slate-500 font-medium font-mono">
                        {v.created_at ? formatDate(v.created_at) : (v.addedDate ? formatDate(v.addedDate) : '-')}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View History Button */}
                          <button
                            onClick={() => setSelectedVehicleForHistory(v)}
                            className="p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                            title="سجل صيانة المركبة"
                          >
                            <span className="material-symbols-outlined text-xl">history</span>
                          </button>

                          {/* Delete Button (Super Admin / Admin Only) */}
                          {isUserAuthorizedToDelete && (
                            <button
                              onClick={() => {
                                setVehicleToDelete(v);
                                setDeleteErrorMessage('');
                              }}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                              title="حذف المركبة"
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-bold">
                الصفحة <span className="font-mono text-slate-800">{pagination.page}</span> من <span className="font-mono text-slate-800">{pagination.totalPages}</span> (إجمالي <span className="font-mono text-slate-800">{pagination.total}</span> مركبة)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1 || isFetching}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  السابقة
                </button>
                <span className="text-xs font-bold text-slate-700 px-2 font-mono">{pagination.page}</span>
                <button
                  disabled={pagination.page >= pagination.totalPages || isFetching}
                  onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  التالية
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 1. DELETE CONFIRMATION MODAL                         */}
      {/* ---------------------------------------------------- */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !deleteMutation.isPending && setVehicleToDelete(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <span className="material-symbols-outlined text-2xl text-rose-600">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">تأكيد حذف المركبة</h3>
                <p className="text-xs text-slate-500 mt-0.5">يرجى التأكد قبل حذف حساب المركبة نهائياً</p>
              </div>
            </div>

            {/* Vehicle Specs Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">المركبة:</span>
                <span className="font-bold text-slate-800">{vehicleToDelete.make} {vehicleToDelete.model} ({vehicleToDelete.year || '-'})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">رقم اللوحة:</span>
                <span className="font-bold text-slate-800 font-mono bg-slate-900 text-white px-2 py-0.5 rounded-md">{vehicleToDelete.license_plate || vehicleToDelete.plateNumber || '---'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">رقم الهيكل (VIN):</span>
                <span className="font-bold text-slate-700 font-mono">{vehicleToDelete.vin && vehicleToDelete.vin !== 'null' ? vehicleToDelete.vin : 'غير مسجل'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">المالك:</span>
                <span className="font-bold text-slate-800">{vehicleToDelete.owner?.name || 'غير معروف'}</span>
              </div>
            </div>

            {/* Error Banner */}
            {deleteErrorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-start gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">error</span>
                <span>{deleteErrorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                disabled={deleteMutation.isPending}
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {deleteMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  'حذف المركبة'
                )}
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => setVehicleToDelete(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. VEHICLE SERVICE HISTORY MODAL                     */}
      {/* ---------------------------------------------------- */}
      {selectedVehicleForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedVehicleForHistory(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                  <span className="material-symbols-outlined text-xl">history</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">سجل صيانة المركبة</h3>
                  <p className="text-xs text-slate-500 font-bold">{selectedVehicleForHistory.make} {selectedVehicleForHistory.model} — {selectedVehicleForHistory.license_plate || selectedVehicleForHistory.plateNumber}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVehicleForHistory(null)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                  <div className="w-8 h-8 border-3 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
                  <p className="text-xs font-bold">جاري تحميل سجل الصيانة الفني...</p>
                </div>
              ) : Array.isArray(historyData) && historyData.length > 0 ? (
                historyData.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">{item.serviceType || item.title || 'عملية صيانة'}</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-100">
                        {item.statusLabel || item.status || 'مكتملة'}
                      </span>
                    </div>

                    {item.notes && <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">{item.notes}</p>}

                    <div className="text-xs flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      {/* Assigned Mechanics List */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-400 font-bold text-[11px]">الفنيون المكلفون:</span>
                        {item.mechanics && item.mechanics.length > 0 ? (
                          item.mechanics.map(m => (
                            <button
                              key={m.id}
                              onClick={() => setSelectedUserId(m.id)}
                              className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-teal-800 transition-all group"
                              title="عرض ملف الفني"
                            >
                              <span className="material-symbols-outlined text-[13px] text-slate-400 group-hover:text-teal-600">engineering</span>
                              {m.name}
                              <span className="material-symbols-outlined text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                            </button>
                          ))
                        ) : (
                          <span className="text-slate-600 font-bold text-xs">{item.technician || 'غير محدد'}</span>
                        )}
                      </div>

                      <span className="font-mono text-slate-500 text-[11px]">تاريخ الموعد: {item.date ? formatDate(item.date) : (item.created_at ? formatDate(item.created_at) : '-')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-2 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                  <span className="material-symbols-outlined text-4xl">folder_off</span>
                  <p className="text-xs font-bold text-slate-600">لا توجد سجلات صيانة تاريخية مسجلة لهذه المركبة في النظام.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. REUSED USER DETAILS MODAL                         */}
      {/* ---------------------------------------------------- */}
      {selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. REUSED VEHICLE DETAILS MODAL                      */}
      {/* ---------------------------------------------------- */}
      {selectedVehicleModal && (
        <VehicleDetailsModal
          vehicleObj={selectedVehicleModal}
          vehicleId={selectedVehicleModal.id}
          onClose={() => setSelectedVehicleModal(null)}
        />
      )}

    </div>
  );
}
