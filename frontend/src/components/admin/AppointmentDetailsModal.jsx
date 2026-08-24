import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsAPI } from '../../services/api';
import VehicleDetailsModal from './VehicleDetailsModal';
import UserDetailsModal from './UserDetailsModal';
import toast from 'react-hot-toast';

export default function AppointmentDetailsModal({ appointmentId, onClose }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: details, isLoading, isError } = useQuery({
    queryKey: ['appointmentDetails', appointmentId],
    queryFn: () => appointmentsAPI.getById(appointmentId),
    enabled: !!appointmentId
  });

  const copyAppointmentId = () => {
    navigator.clipboard.writeText(`#APP-${appointmentId}`);
    toast.success('تم نسخ رقم الموعد للمحافظة');
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'in_progress':
      case 'under_inspection':
        return <span className="bg-teal-50 text-teal-800 border border-teal-100 px-3 py-1 rounded-full text-xs font-bold">قيد الفحص / الإصلاح</span>;
      case 'waiting_parts':
        return <span className="bg-amber-50 text-amber-800 border border-amber-100 px-3 py-1 rounded-full text-xs font-bold">بانتظار القطع</span>;
      case 'completed':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold">مكتمل</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const getPartStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="bg-amber-50 text-amber-800 border border-amber-100 px-2.5 py-1 rounded-lg text-xs font-bold">قيد الانتظار</span>;
      case 'approved': return <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold">معتمد</span>;
      case 'rejected': return <span className="bg-rose-50 text-rose-800 border border-rose-100 px-2.5 py-1 rounded-lg text-xs font-bold">مرفوض</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-primary">
              <span className="material-symbols-outlined text-2xl">assignment</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">تفاصيل المهمة والموعد</h2>
                <button
                  type="button"
                  onClick={copyAppointmentId}
                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[11px] font-mono font-bold transition-colors"
                  title="نسخ رقم الموعد"
                >
                  <span>#APP-{appointmentId}</span>
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">تفاصيل شاملة للمركبة والإصلاح والقطع المطلوبة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : isError || !details ? (
            <div className="text-center text-rose-500 font-bold py-10">حدث خطأ في تحميل تفاصيل المهمة.</div>
          ) : (
            <div className="space-y-8">

              {/* Section 1: General Info */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">info</span>
                    معلومات العميل والطرف المعني
                  </h3>
                  {getStatusBadge(details.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Customer Link */}
                  <div
                    onClick={() => setSelectedUser({ id: details.client_id, userObj: { name: details.clientName, phone: details.clientPhone, role: 'client' } })}
                    className="p-3 bg-slate-50/70 hover:bg-teal-50/60 rounded-xl border border-slate-100 hover:border-teal-100 cursor-pointer transition-all group"
                  >
                    <span className="text-[10px] text-slate-400 group-hover:text-teal-700 font-bold uppercase tracking-wide block mb-1">العميل (انقر للتفاصيل)</span>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-teal-800 flex items-center gap-1">
                      {details.clientName}
                      <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                    </p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{details.clientPhone}</p>
                  </div>

                  {/* Vehicle Link */}
                  <div
                    onClick={() => setSelectedVehicle({ id: details.vehicle_id, vehicleObj: { make: details.vehicleMake, model: details.vehicleModel, license_plate: details.vehiclePlate } })}
                    className="p-3 bg-slate-50/70 hover:bg-teal-50/60 rounded-xl border border-slate-100 hover:border-teal-100 cursor-pointer transition-all group"
                  >
                    <span className="text-[10px] text-slate-400 group-hover:text-teal-700 font-bold uppercase tracking-wide block mb-1">المركبة (انقر للتفاصيل)</span>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-teal-800 flex items-center gap-1">
                      {details.car}
                      <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                    </p>
                  </div>

                  {/* Technicians Link */}
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wide block mb-1">الفنيون المكلفون</span>
                    {Array.isArray(details.mechanics) && details.mechanics.length > 0 ? (
                      <div className="space-y-1.5 mt-1">
                        {details.mechanics.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => setSelectedUser({ id: m.id, userObj: { name: m.name, role: 'mechanic' } })}
                            className="flex items-center gap-2 cursor-pointer hover:underline text-teal-900 group"
                          >
                            <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">
                              {m.name?.charAt(0) || 'م'}
                            </div>
                            <p className="text-xs font-bold group-hover:text-primary flex items-center gap-1">
                              {m.name}
                              <span className="material-symbols-outlined text-[11px] opacity-0 group-hover:opacity-100">open_in_new</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">
                          {details.mechanicName?.charAt(0) || 'م'}
                        </div>
                        <p className="text-xs font-bold text-teal-900">{details.mechanicName || 'غير محدد'}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">شكوى العميل الأساسية</span>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{details.issue}</p>
                </div>
              </div>

              {/* Section 2: Technical Inspection Report */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">plumbing</span>
                  تقرير الفحص الفني والتشخيص
                </h3>

                {!details.report ? (
                  <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <span className="material-symbols-outlined text-3xl mb-2">pending_actions</span>
                    <p className="text-sm font-bold">لم يتم رفع التقرير الفني بعد</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Col: Odometer & Diagnostics */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="material-symbols-outlined text-slate-400">speed</span>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">قراءة العداد الحالية</span>
                          <span className="text-sm font-bold text-slate-800 font-mono">{details.report.odometer ? `${details.report.odometer} كم` : 'غير متوفر'}</span>
                        </div>
                      </div>

                      {/* OBD-II DTC Badges */}
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">أكواد الفحص بالكمبيوتر (OBD-II DTCs)</span>
                        {details.report.obd2_codes ? (
                          <div className="flex flex-wrap gap-2">
                            {details.report.obd2_codes.split(',').map((code, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs"
                              >
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                {code.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 font-bold">لا توجد أكواد تشخيصية مسجلة</p>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">ملاحظات الفحص البصري</span>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                          {details.report.visual_notes || details.report.visual_inspection_notes || 'لا توجد ملاحظات إضافية'}
                        </p>
                      </div>
                    </div>

                    {/* Right Col: Bounded Repair Plan (Fixes Overflow) */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-primary font-bold uppercase block mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">build_circle</span>
                        خطة العمل والإصلاح المقترحة
                      </span>
                      <div className="flex-1 bg-teal-50/40 p-4 rounded-2xl border border-teal-100/60 max-w-full overflow-hidden">
                        <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap break-words max-w-full font-sans">
                          {details.report.repair_plan || 'لم يتم تحديد خطة إصلاح تفصيلية'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Spare Parts & Inventory Integration */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">inventory_2</span>
                    القطع المطلوبة وحالة المخزون
                  </h3>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold font-mono">
                    العدد: {details.requestedParts?.length || 0}
                  </span>
                </div>

                {!details.requestedParts || details.requestedParts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <span className="material-symbols-outlined text-3xl mb-2">inventory</span>
                    <p className="text-sm font-bold">لم يطلب الفني أي قطع غيار لهذه المهمة</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-4 py-3 rounded-tr-xl rounded-br-xl">اسم القطعة</th>
                          <th className="px-4 py-3">الكمية المطلوبة</th>
                          <th className="px-4 py-3">توفر المخزون</th>
                          <th className="px-4 py-3">سعر الوحدة</th>
                          <th className="px-4 py-3 rounded-tl-xl rounded-bl-xl">حالة الطلب</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {details.requestedParts.map(part => {
                          const isAvailable = part.stock_quantity !== null && part.stock_quantity >= part.quantity;
                          return (
                            <tr key={part.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-800">
                                {part.name}
                                {part.part_number && <span className="block text-[11px] font-mono text-slate-400">{part.part_number}</span>}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-700">{part.quantity}</td>
                              <td className="px-4 py-3">
                                {part.stock_quantity === null ? (
                                  <span className="text-xs text-slate-400 font-bold">غير معروف</span>
                                ) : isAvailable ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    متوفر ({part.stock_quantity})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-100 px-2.5 py-1 rounded-lg text-xs font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    غير كافي ({part.stock_quantity})
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-700">{part.price} ر.س</td>
                              <td className="px-4 py-3">{getPartStatusBadge(part.status)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Embedded Vehicle Details Modal */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicleId={selectedVehicle.id}
          vehicleObj={selectedVehicle.vehicleObj}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

      {/* Embedded User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          userId={selectedUser.id}
          user={selectedUser.userObj}
          onClose={() => setSelectedUser(null)}
        />
      )}

    </div>
  );
}
