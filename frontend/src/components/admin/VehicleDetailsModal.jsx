import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vehiclesAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import UserDetailsModal from './UserDetailsModal';

export default function VehicleDetailsModal({ vehicleId, vehicleObj, onClose }) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const activeId = vehicleId || vehicleObj?.id;

  const { data: fetchedVehicle, isLoading: isDetailsLoading, isError } = useQuery({
    queryKey: ['vehicleDetails', activeId],
    queryFn: () => vehiclesAPI.getById(activeId),
    enabled: !!activeId
  });

  const { data: history = [] } = useQuery({
    queryKey: ['vehicleHistory', activeId],
    queryFn: () => vehiclesAPI.getHistory(activeId),
    enabled: !!activeId
  });

  const vehicle = fetchedVehicle || (isDetailsLoading ? null : vehicleObj);

  if (!activeId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-teal-700">
              <span className="material-symbols-outlined text-2xl">directions_car</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">تفاصيل المركبة</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                {isDetailsLoading ? 'جاري التحميل...' : `${vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.year || ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-50/30">
          {isDetailsLoading ? (
            <div className="flex flex-col justify-center items-center h-48 space-y-3">
              <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-500 animate-pulse">جاري تحميل بيانات المركبة والسجل الفني...</p>
            </div>
          ) : isError || !vehicle ? (
            <div className="text-center py-10 text-rose-500 font-bold text-sm">
              تعذر تحميل بيانات المركبة، يرجى المحاولة مرة أخرى.
            </div>
          ) : (
            <>
              {/* Card 1: Identity & License Plate */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">الماركة والموديل</span>
                  <h3 className="text-lg font-bold text-slate-800">{vehicle.make} {vehicle.model}</h3>
                  <span className="text-xs text-slate-500 font-mono mt-0.5 block">سنة الصنع: {vehicle.year || 'غير محدد'}</span>
                </div>

                <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-mono text-center shadow-inner border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">رقم اللوحة</span>
                  <span className="text-base font-bold tracking-widest">{vehicle.license_plate || vehicle.plateNumber || '---'}</span>
                </div>
              </div>

              {/* Card 2: Owner & Technical Spec Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Interactive Owner Info */}
                <div
                  onClick={() => vehicle.owner?.id && setSelectedUserId(vehicle.owner.id)}
                  className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 transition-all ${
                    vehicle.owner?.id ? 'hover:border-teal-200 hover:bg-teal-50/30 cursor-pointer group' : ''
                  }`}
                  title={vehicle.owner?.id ? 'عرض الملف الشخصي للمالك' : ''}
                >
                  <span className="text-[10px] text-slate-400 group-hover:text-teal-700 font-bold uppercase tracking-wider block mb-2 transition-colors">
                    مالك المركبة {vehicle.owner?.id && '(انقر للتفاصيل)'}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                      {vehicle.owner?.name?.charAt(0) || 'ع'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-teal-800 flex items-center gap-1 transition-colors">
                        {vehicle.owner?.name || 'غير معروف'}
                        {vehicle.owner?.id && (
                          <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                        )}
                      </p>
                      <p className="text-xs font-mono text-slate-500 truncate">{vehicle.owner?.email || vehicle.owner?.phone || '---'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Spec */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">رقم الهيكل (VIN)</span>
                  <p className="text-sm font-mono font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 truncate">
                    {vehicle.vin || 'غير متوفر'}
                  </p>
                </div>
              </div>

              {/* Card 3: Service History */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">history</span>
                    سجل الصيانة والتصليحات
                  </h4>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-mono">
                    عدد العمليات: {history.length || vehicle.appointments?.length || 0}
                  </span>
                </div>

                {(history.length === 0 && (!vehicle.appointments || vehicle.appointments.length === 0)) ? (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <p className="text-xs font-bold">لا توجد سجلات صيانة سابقة لهذه المركبة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(history.length > 0 ? history : vehicle.appointments).map(item => (
                      <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{item.serviceType || item.title || 'صيانة دورية'}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">الفني: {item.technician || 'غير محدد'}</p>
                        </div>
                        <div className="text-left">
                          <span className="font-mono text-slate-600 block">{formatDate(item.date)}</span>
                          <span className="font-bold text-teal-700 font-mono block mt-0.5">{item.cost ? `${item.cost} ر.س` : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Owner User Details Modal */}
      {selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
