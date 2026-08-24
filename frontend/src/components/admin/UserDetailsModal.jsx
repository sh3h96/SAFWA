import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import VehicleDetailsModal from './VehicleDetailsModal';
import ImageUploader from './ImageUploader';

export default function UserDetailsModal({ user: directUser, userId, onClose }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const targetId = userId || directUser?.id;
  const queryClient = useQueryClient();

  const { data: fetchedUser, isLoading, isError, refetch } = useQuery({
    queryKey: ['userDetails', targetId],
    queryFn: () => usersAPI.getById(targetId),
    enabled: !!targetId
  });

  const user = fetchedUser || (isLoading ? null : directUser);

  if (!targetId) return null;

  const getRoleLabel = (r) => {
    switch (r) {
      case 'admin': return 'إدارة';
      case 'super_admin': return 'سوبر أدمن';
      case 'mechanic': return 'ميكانيكي';
      case 'client': return 'عميل';
      default: return r || 'مستخدم';
    }
  };

  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'admin':
      case 'super_admin':
        return 'bg-purple-50 text-purple-800 border border-purple-100';
      case 'mechanic':
        return 'bg-teal-50 text-teal-800 border border-teal-100';
      case 'client':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  };

  const getAppointmentStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">بانتظار التأكيد</span>;
      case 'awaiting_assignment': return <span className="bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 rounded text-[10px] font-bold">بانتظار التعيين</span>;
      case 'in_progress':
      case 'under_inspection':
        return <span className="bg-teal-50 text-teal-800 border border-teal-100 px-2 py-0.5 rounded text-[10px] font-bold">قيد الإصلاح</span>;
      case 'completed': return <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">مكتمل</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300"
      >

        {/* Header Section */}
        <div className="shrink-0 px-8 py-8 bg-slate-50/50 border-b border-slate-100 flex flex-col items-center text-center relative">
          <button
            onClick={onClose}
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>

          <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">
            {isLoading ? 'جاري تحميل بيانات الملف...' : (user?.name || 'غير معروف')}
          </h2>

          {!isLoading && user && (
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeStyle(user?.role)}`}>
                {getRoleLabel(user?.role)}
              </span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                user?.status === 'active' || user?.status === 'نشط' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
              }`}>
                {user?.status === 'active' || user?.status === 'نشط' ? 'حساب نشط' : 'موقوف'}
              </span>
            </div>
          )}

          {!isLoading && user && (
            <ImageUploader
              entityType="user"
              entityId={user.id}
              currentImageUrl={user.avatar_url || user.avatarUrl}
              onImageUpdated={() => {
                queryClient.invalidateQueries(['userDetails', targetId]);
                refetch();
              }}
              onImageDeleted={() => {
                queryClient.invalidateQueries(['userDetails', targetId]);
                refetch();
              }}
              label="الصورة الشخصية"
            />
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-50/30">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-48 space-y-3">
              <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-500 animate-pulse">جاري تحميل معلومات الملف الشخصي من النظام...</p>
            </div>
          ) : isError || !user ? (
            <div className="text-center py-10 text-rose-500 font-bold text-sm">
              تعذر تحميل بيانات المستخدم، يرجى المحاولة مرة أخرى.
            </div>
          ) : (
            <>
              {/* Contact Info Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100 pb-2">معلومات الملف والتواصل</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                      <span className="font-bold text-xs">البريد الإلكتروني</span>
                    </div>
                    <span className="font-medium text-slate-800">{user.email || 'غير متوفر'}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-[18px]">call</span>
                      <span className="font-bold text-xs">رقم الجوال</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">{user.phone || 'غير متوفر'}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                      <span className="font-bold text-xs">تاريخ الانضمام</span>
                    </div>
                    <span className="font-mono text-slate-700">{user.created_at ? formatDate(user.created_at) : 'غير محدد'}</span>
                  </div>
                </div>
              </div>

              {/* Client Specific: Registered Vehicles & History */}
              {user.role === 'client' && (
                <>
                  {/* Registered Vehicles */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">المركبات المسجلة (انقر للتفاصيل)</h3>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold font-mono">
                        {user.vehicles?.length || 0} مركبة
                      </span>
                    </div>

                    {!user.vehicles || user.vehicles.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold py-2 text-center">لا توجد مركبات مسجلة لهذا العميل في النظام</p>
                    ) : (
                      <div className="space-y-2">
                        {user.vehicles.map(v => (
                          <div
                            key={v.id}
                            onClick={() => setSelectedVehicleId(v.id)}
                            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-teal-50/60 border border-slate-100 hover:border-teal-100/60 rounded-xl cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-600 transition-colors">directions_car</span>
                              <div>
                                <p className="text-sm font-bold text-slate-800 group-hover:text-teal-800 flex items-center gap-1 transition-colors">
                                  {v.name}
                                  <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                                </p>
                                {v.license_plate && <span className="text-[11px] font-mono text-slate-500">{v.license_plate}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-teal-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity">عرض المركبة</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Appointment History */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">سجل مواعيد وصيانة العميل</h3>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold font-mono">
                        {user.appointments?.length || 0} موعد
                      </span>
                    </div>

                    {!user.appointments || user.appointments.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold py-2 text-center">لا يوجد سجل مواعيد سابق للعميل في النظام</p>
                    ) : (
                      <div className="space-y-2.5">
                        {user.appointments.map(app => (
                          <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-slate-800">{app.vehicle_name}</span>
                              {getAppointmentStatusBadge(app.status)}
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2">{app.problem_description}</p>
                            <span className="text-[10px] font-mono text-slate-400 block">{formatDate(app.date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Mechanic Specific: Assigned Work History */}
              {user.role === 'mechanic' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">المهام والمواعيد المسندة للفني</h3>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold font-mono">
                      {user.appointments?.length || 0} مهمة
                    </span>
                  </div>

                  {!user.appointments || user.appointments.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold py-2 text-center">لا توجد مهام مسندة حالياً لهذا الفني</p>
                  ) : (
                    <div className="space-y-2.5">
                      {user.appointments.map(app => (
                        <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-800">{app.vehicle_name}</span>
                            {getAppointmentStatusBadge(app.status)}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">{app.problem_description}</p>
                          <span className="text-[10px] font-mono text-slate-400 block">{formatDate(app.date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
