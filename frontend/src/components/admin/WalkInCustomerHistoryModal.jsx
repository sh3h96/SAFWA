import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { walkInAPI, getErrorMessage } from '../../services/api';

const statusMap = {
  pending: { label: 'قيد الانتظار', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  awaiting_assignment: { label: 'بانتظار التعيين', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  in_progress: { label: 'قيد التنفيذ', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  under_inspection: { label: 'قيد الفحص', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ready_for_pickup: { label: 'جاهزة للاستلام', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  completed: { label: 'مكتملة', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'ملغاة', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
};

export default function WalkInCustomerHistoryModal({ customerId, isOpen, onClose, onSelectVehicle }) {
  const { data: historyData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['walkInCustomerHistory', customerId],
    queryFn: () => walkInAPI.getCustomerHistory(customerId),
    enabled: isOpen && !!customerId
  });

  if (!isOpen || !customerId) return null;

  const customer = historyData?.customer || {};
  const visits = historyData?.visits || [];
  const stats = historyData?.stats || { totalVisits: visits.length, totalSpent: 0, vehicleCount: 0 };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#161d27] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-100 font-sans"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-[#121820]/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">person_pin</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {customer.name || 'جاري التحميل...'}
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  عميل مباشر
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                رقم الجوال: <span className="font-mono text-gray-200" dir="ltr">{customer.phone || '-'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium">جاري تحميل سجل العميل المباشر...</p>
            </div>
          ) : isError ? (
            <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-center">
              <p className="text-sm font-medium">{getErrorMessage(error, 'تعذر تحميل سجل العميل المباشر')}</p>
              <button
                onClick={() => refetch()}
                className="mt-3 px-4 py-2 text-xs font-semibold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <>
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#1a2330] border border-gray-800/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">build_circle</span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">إجمالي الزيارات</div>
                    <div className="text-lg font-bold text-white">{stats.totalVisits} زيارة</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1a2330] border border-gray-800/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">payments</span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">إجمالي المدفوعات</div>
                    <div className="text-lg font-bold text-emerald-400">{stats.totalSpent?.toLocaleString()} ر.ي</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1a2330] border border-gray-800/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">directions_car</span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">المركبات المستخدمة</div>
                    <div className="text-lg font-bold text-white">{stats.vehicleCount || (customer.vehicles ? customer.vehicles.length : 1)} مركبة</div>
                  </div>
                </div>
              </div>

              {/* Notes if available */}
              {customer.notes && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-200/90 text-sm">
                  <span className="font-semibold text-amber-400 block mb-1">ملاحظات الإدارة:</span>
                  {customer.notes}
                </div>
              )}

              {/* Visit History Timeline */}
              <div>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">history</span>
                  سجل الزيارات الفني والمالي
                </h3>

                {visits.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 bg-[#121820]/40 rounded-xl border border-gray-800">
                    لا توجد زيارات مسجلة لهذا العميل.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visits.map((visit) => {
                      const statusInfo = statusMap[visit.status] || { label: visit.status, bg: 'bg-gray-800 text-gray-300' };
                      const vSnap = visit.vehicleSnapshot || {};

                      return (
                        <div
                          key={visit.id}
                          className="p-5 rounded-xl bg-[#131b26] border border-gray-800/90 hover:border-gray-700 transition-all space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-semibold text-gray-400">
                                {new Date(visit.visitDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusInfo.bg}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            {visit.invoice && (
                              <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                                فاتورة: {visit.invoice.totalAmount?.toLocaleString()} ر.ي ({visit.invoice.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'})
                              </div>
                            )}
                          </div>

                          {/* Vehicle Snapshot Info */}
                          <div
                            onClick={() => {
                              const resolvedVehId = vSnap.id || visit.vehicleId || visit.vehicle_id || null;
                              if (onSelectVehicle) {
                                onSelectVehicle({
                                  id: resolvedVehId,
                                  vehicleObj: {
                                    id: resolvedVehId,
                                    make: vSnap.make,
                                    model: vSnap.model,
                                    year: vSnap.year,
                                    color: vSnap.color,
                                    license_plate: vSnap.licensePlate,
                                    vin: vSnap.vin,
                                    transmission: vSnap.transmission || visit.vehicle_transmission,
                                    fuel_type: vSnap.fuelType || visit.vehicle_fuel_type,
                                    walkInCustomerName: customer.name,
                                    walkInCustomerPhone: customer.phone
                                  }
                                });
                              }
                            }}
                            className={`p-3 rounded-lg bg-[#1a2330] border border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs ${
                              onSelectVehicle ? 'hover:border-amber-500/40 cursor-pointer transition-all' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 text-gray-200 font-medium">
                              <span className="material-symbols-outlined text-amber-400 text-base">directions_car</span>
                              <span>{vSnap.make} {vSnap.model} {vSnap.year ? `(${vSnap.year})` : ''}</span>
                              {vSnap.color && <span className="text-gray-400">• اللون: {vSnap.color}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              {vSnap.licensePlate && (
                                <span className="font-mono bg-gray-900 px-2 py-0.5 rounded text-amber-300 border border-gray-700">
                                  {vSnap.licensePlate}
                                </span>
                              )}
                              {vSnap.vin && (
                                <span className="font-mono text-gray-400">
                                  VIN: {vSnap.vin}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Complaint / Problem Description */}
                          <div className="text-sm text-gray-300">
                            <span className="text-xs text-gray-500 block mb-0.5">طلب الصيانة / شكوى العميل:</span>
                            {visit.problemDescription}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-[#121820]/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
