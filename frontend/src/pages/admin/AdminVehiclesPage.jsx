import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { vehiclesAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';

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
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search
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
        setDeleteErrorMessage(serverMsg || 'حدث خطأ غير متوقع أثناء حاول حذف المركبة.');
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
          <p className="text-slate-500 mt-1 text-sm">عرض المركبات المسجلة، معلومات المالك، والتحكم بالبحث والحذف الآمن.</p>
        </div>
        <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">directions_car</span>
          <span className="text-sm font-bold text-slate-700">إجمالي المركبات: {pagination.total || vehicles.length}</span>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="ابحث برقم اللوحة، الماركة، الموديل، VIN، اسم المالك، الهاتف، الإيميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="الماركة (Make)"
              value={makeFilter}
              onChange={handleMakeChange}
              className="w-32 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            />
            <input
              type="text"
              placeholder="الموديل (Model)"
              value={modelFilter}
              onChange={handleModelChange}
              className="w-32 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            />
            <input
              type="text"
              placeholder="السنة (Year)"
              value={yearFilter}
              onChange={handleYearChange}
              className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            />

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={handleSortByChange}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="created_at">تاريخ الإضافة</option>
              <option value="make">الماركة</option>
              <option value="model">الموديل</option>
              <option value="year">السنة</option>
              <option value="license_plate">رقم اللوحة</option>
            </select>

            <button
              onClick={handleSortOrderToggle}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center"
              title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
            >
              <span className="material-symbols-outlined text-lg">
                {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
              </span>
            </button>

            {(searchTerm || makeFilter || modelFilter || yearFilter || sortBy !== 'created_at') && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Vehicles Table / Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm font-bold animate-pulse">جاري تحميل المركبات...</p>
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
                      {/* Make & Model & Year */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                            <span className="material-symbols-outlined">directions_car</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{v.make} {v.model}</p>
                            <span className="text-xs font-semibold text-slate-400">سنة الصنع: {v.year || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* License Plate */}
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700">
                          {v.license_plate || v.plateNumber || '-'}
                        </span>
                      </td>

                      {/* VIN */}
                      <td className="py-4 px-6">
                        <span className="text-xs font-mono font-medium text-slate-500 truncate block max-w-[140px]">
                          {v.vin || 'غير متوفر'}
                        </span>
                      </td>

                      {/* Owner Info */}
                      <td className="py-4 px-6">
                        {v.owner ? (
                          <div>
                            <p className="font-bold text-slate-700 text-xs">{v.owner.name || 'غير متوفر'}</p>
                            <p className="text-[11px] text-slate-400 font-mono dir-ltr text-right">{v.owner.phone || ''}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{v.owner.email || ''}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">غير متوفر</span>
                        )}
                      </td>

                      {/* Added Date */}
                      <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                        {v.created_at ? new Date(v.created_at).toLocaleDateString('ar-SA') : (v.addedDate || '-')}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* View History Button */}
                          <button
                            onClick={() => setSelectedVehicleForHistory(v)}
                            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="سجل الصيانة"
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
                الصفحة {pagination.page} من {pagination.totalPages} (إجمالي {pagination.total} مركبة)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1 || isFetching}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  السابقة
                </button>
                <span className="text-xs font-bold text-slate-700 px-2">{pagination.page}</span>
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

      {/* Delete Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => !deleteMutation.isPending && setVehicleToDelete(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">تأكيد حذف المركبة</h3>
                <p className="text-xs text-slate-500 mt-0.5">هل أنت تأكد من رغبتك في حذف هذه المركبة؟</p>
              </div>
            </div>

            {/* Vehicle Details Card in Modal */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">المركبة:</span>
                <span className="font-bold text-slate-800">{vehicleToDelete.make} {vehicleToDelete.model} ({vehicleToDelete.year || '-'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">رقم اللوحة:</span>
                <span className="font-bold text-slate-800 font-mono">{vehicleToDelete.license_plate || vehicleToDelete.plateNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">المالك:</span>
                <span className="font-bold text-slate-800">{vehicleToDelete.owner?.name || 'غير محدد'}</span>
              </div>
            </div>

            {/* Error Message Warning Banner */}
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
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  'تأكيد الحذف'
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

      {/* Vehicle History Modal */}
      {selectedVehicleForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setSelectedVehicleForHistory(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-indigo-600">history</span>
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
                  <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-xs font-bold">جاري تحميل سجل الصيانة...</p>
                </div>
              ) : Array.isArray(historyData) && historyData.length > 0 ? (
                historyData.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">{item.service_type || item.issue || 'عملية صيانة'}</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600">{item.status || 'مكتمل'}</span>
                    </div>
                    {item.notes && <p className="text-xs text-slate-600">{item.notes}</p>}
                    <div className="text-[11px] text-slate-400 flex justify-between font-mono pt-1 border-t border-slate-200/50">
                      <span>تاريخ الموعد: {item.date || (item.created_at ? new Date(item.created_at).toLocaleDateString('ar-SA') : '-')}</span>
                      <span>الفني: {item.mechanic_name || item.mechanicName || 'غير محدد'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <span className="material-symbols-outlined text-4xl">folder_off</span>
                  <p className="text-xs font-bold">لا توجد سجلات صيانة تاريخية مسجلة لهذه المركبة.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
