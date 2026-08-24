import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { vehiclesAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import UserDetailsModal from './UserDetailsModal';
import WalkInCustomerHistoryModal from './WalkInCustomerHistoryModal';
import ImageUploader from './ImageUploader';

export default function VehicleDetailsModal({ vehicleId, vehicleObj, onClose }) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedWalkInCustomerId, setSelectedWalkInCustomerId] = useState(null);
  const activeId = vehicleId || vehicleObj?.id;
  const queryClient = useQueryClient();

  const { data: fetchedVehicle, isLoading: isDetailsLoading, isError, refetch } = useQuery({
    queryKey: ['vehicleDetails', activeId],
    queryFn: () => vehiclesAPI.getById(activeId),
    enabled: !!activeId
  });

  const vehicle = fetchedVehicle || vehicleObj;
  const isLoading = isDetailsLoading && !vehicleObj;

  if (!activeId && !vehicleObj) return null;

  const handleImageUpdated = (newUrl) => {
    if (activeId) {
      queryClient.invalidateQueries(['vehicleDetails', activeId]);
      refetch();
    }
  };

  const handleImageDeleted = () => {
    if (activeId) {
      queryClient.invalidateQueries(['vehicleDetails', activeId]);
      refetch();
    }
  };

  const associatedUsers = vehicle?.associatedUsers || (vehicle?.owner ? [vehicle.owner] : []);
  const associatedWalkIns = (vehicle?.associatedWalkInCustomers && vehicle.associatedWalkInCustomers.length > 0)
    ? vehicle.associatedWalkInCustomers
    : (vehicle?.walkInCustomer
        ? [vehicle.walkInCustomer]
        : (vehicle?.walkInCustomerName
            ? [{ id: vehicle.walkInCustomerId || null, name: vehicle.walkInCustomerName, phone: vehicle.walkInCustomerPhone || '' }]
            : []));
  const plateHistory = vehicle?.plateHistory || [];
  const appointments = vehicle?.appointments || [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#161d27] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-100"
      >

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#121820]/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">directions_car</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {vehicle ? `${vehicle.make} ${vehicle.model}` : 'جاري التحميل...'}
                {vehicle?.year && <span className="text-xs text-gray-400 font-mono">({vehicle.year})</span>}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                اللوحة الحالية: <span className="font-mono text-amber-300 font-bold">{vehicle?.license_plate || vehicle?.plateNumber || '---'}</span>
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

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium">جاري تحميل بيانات المركبة الشاملة...</p>
            </div>
          ) : (!vehicle) ? (
            <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-center">
              <p className="text-sm font-medium">تعذر تحميل بيانات المركبة.</p>
              <button
                onClick={() => refetch()}
                className="mt-3 px-4 py-2 text-xs font-semibold bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <>
              {/* Section 1: Specifications & Image */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-xl bg-[#121820] border border-gray-800">
                {/* Left/Main Column: Image Upload */}
                <div className="md:col-span-1 border-b md:border-b-0 md:border-l border-gray-800 pb-4 md:pb-0 md:pl-4">
                  <ImageUploader
                    entityType="vehicle"
                    entityId={vehicle.id}
                    currentImageUrl={vehicle.image_url}
                    onImageUpdated={handleImageUpdated}
                    onImageDeleted={handleImageDeleted}
                    label="صورة المركبة"
                  />
                </div>

                {/* Technical Specifications Grid */}
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-[#1a2330] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-semibold">الماركة (Make)</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{vehicle.make}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1a2330] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-semibold">الموديل (Model)</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{vehicle.model}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1a2330] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-semibold">سنة الصنع (Year)</span>
                    <span className="text-sm font-bold font-mono text-white mt-0.5 block">{vehicle.year || 'غير محدد'}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1a2330] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-semibold">رقم اللوحة الحالي</span>
                    <span className="text-sm font-bold font-mono text-amber-400 mt-0.5 block">{vehicle.license_plate}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1a2330] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-semibold">رقم الهيكل (VIN)</span>
                    <span className="text-xs font-bold font-mono text-gray-200 mt-0.5 block truncate">{vehicle.vin || 'غير مسجل'}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1a2330] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-semibold">اللون (Color)</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{vehicle.color || 'غير محدد'}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1a2330] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-semibold">ناقل الحركة (Transmission)</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{vehicle.transmission || 'غير محدد'}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#1a2330] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-semibold">نوع الوقود (Fuel)</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{vehicle.fuel_type || 'غير محدد'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Associated Customers */}
              <div className="p-5 rounded-xl bg-[#121820] border border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg">group</span>
                  العملاء المرتبطون بسجل المركبة
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Registered Users */}
                  {associatedUsers.map(user => (
                    <div
                      key={`user-${user.id}`}
                      onClick={() => setSelectedUserId(user.id)}
                      className="p-3 rounded-xl bg-[#1a2330] border border-gray-800 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                          {user.name?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">{user.phone || user.email}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                        حساب مسجل
                      </span>
                    </div>
                  ))}

                  {/* Walk-in Customers */}
                  {associatedWalkIns.map(wCust => (
                    <div
                      key={`walkin-${wCust.id}`}
                      onClick={() => setSelectedWalkInCustomerId(wCust.id)}
                      className="p-3 rounded-xl bg-[#1a2330] border border-gray-800 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                          {wCust.name?.charAt(0) || 'ع'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                            {wCust.name}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">{wCust.phone}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                        عميل مباشر
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: License Plate History Timeline */}
              {plateHistory.length > 0 && (
                <div className="p-5 rounded-xl bg-[#121820] border border-gray-800 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">timeline</span>
                    سجل اللوحات المتعاقبة (Plate History Timeline)
                  </h3>

                  <div className="space-y-2">
                    {plateHistory.map((ph) => (
                      <div
                        key={ph.id}
                        className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                          ph.is_active
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-[#1a2330] border-gray-800 text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm bg-gray-900 px-2.5 py-1 rounded border border-gray-700 text-amber-300">
                            {ph.license_plate}
                          </span>
                          <span>
                            {ph.is_active ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full">
                                اللوحة الحالية
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-800 text-gray-400 rounded-full">
                                لوحة سابقة
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="text-left font-mono text-[11px] text-gray-400">
                          تاريخ البداية: {new Date(ph.start_date).toLocaleDateString('ar-EG')}
                          {ph.end_date && ` — تاريخ النهاية: ${new Date(ph.end_date).toLocaleDateString('ar-EG')}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Maintenance History */}
              <div className="p-5 rounded-xl bg-[#121820] border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">history</span>
                    سجل عمليات الصيانة المنجزة
                  </h3>
                  <span className="text-xs font-mono font-bold text-gray-400 bg-gray-800 px-2.5 py-1 rounded-md">
                    عدد العمليات: {appointments.length}
                  </span>
                </div>

                {appointments.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 bg-[#1a2330] rounded-lg border border-gray-800 text-xs">
                    لا توجد عمليات صيانة تاريخية مسجلة لهذه المركبة.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((app) => (
                      <div
                        key={app.id}
                        className="p-3.5 rounded-lg bg-[#1a2330] border border-gray-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{app.serviceType}</span>
                          <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {app.statusLabel}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-gray-400 pt-2 border-t border-gray-800 gap-2">
                          <div className="flex items-center gap-3">
                            <span>التاريخ: <span className="font-mono text-gray-200">{formatDate(app.date)}</span></span>
                            {app.client && (
                              <span>العميل وقت الصيانة: <span className="text-amber-400 font-medium">{app.client.name}</span></span>
                            )}
                          </div>
                          <div className="font-mono text-emerald-400 font-bold">
                            {app.cost ? `${app.cost.toLocaleString()} ر.ي` : '---'}
                          </div>
                        </div>
                      </div>
                    ))}
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

      {/* Nested User Modal */}
      {selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* Nested Walk-in Customer History Modal */}
      {selectedWalkInCustomerId && (
        <WalkInCustomerHistoryModal
          customerId={selectedWalkInCustomerId}
          isOpen={true}
          onClose={() => setSelectedWalkInCustomerId(null)}
        />
      )}
    </div>
  );
}
