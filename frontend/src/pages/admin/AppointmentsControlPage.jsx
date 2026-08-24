import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { appointmentsAPI, usersAPI, handoverAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import AppointmentDetailsModal from '../../components/admin/AppointmentDetailsModal';
import VehicleDetailsModal from '../../components/admin/VehicleDetailsModal';
import UserDetailsModal from '../../components/admin/UserDetailsModal';
import WalkInCustomerHistoryModal from '../../components/admin/WalkInCustomerHistoryModal';
import WalkInModal from '../../components/admin/WalkInModal';
import MultiSelect from '../../components/common/MultiSelect';
import EntityImage from '../../components/common/EntityImage';
import { formatDate, formatTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

import ReworkModal from '../../components/admin/ReworkModal';
import ViewInvoiceModal from '../../components/admin/ViewInvoiceModal';

export default function AppointmentsControlPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);

  // Modal & Rework states
  const [selectedInvoiceApp, setSelectedInvoiceApp] = useState(null); // { invoiceId, appointmentId }
  const [reworkTargetApp, setReworkTargetApp] = useState(null);

  const reworkMutation = useMutation({
    mutationFn: ({ id, data }) => appointmentsAPI.requestRework(id, data),
    onSuccess: () => {
      toast.success('تمت إعادة المركبة لقسم الإصلاح وإضافة ملاحظات الفحص بنجاح');
      setReworkTargetApp(null);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: appointments = [], isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['appointments', debouncedSearch],
    queryFn: () => appointmentsAPI.getAll(debouncedSearch),
    placeholderData: keepPreviousData
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getAll
  });

  const mechanics = allUsers.filter(u => u.role === 'mechanic');

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }) => appointmentsAPI.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });

  const handoverMutation = useMutation({
    mutationFn: (id) => handoverAPI.performHandover(id),
    onSuccess: (data) => {
      toast.success(data.message || 'تمت عملية تسليم المركبة للعميل بنجاح');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });

  // Modal States
  const [selectedMechanics, setSelectedMechanics] = useState({});
  const [activeFilter, setActiveFilter] = useState('pending');
  const [detailsModalAppId, setDetailsModalAppId] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null); // { id, vehicleObj }
  const [selectedUser, setSelectedUser] = useState(null); // { id, userObj }
  const [selectedWalkInCustomerId, setSelectedWalkInCustomerId] = useState(null);
  const [cancellationModalAppId, setCancellationModalAppId] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const columns = [
    { id: 'pending', label: 'بانتظار التأكيد', color: 'bg-slate-100 text-slate-700' },
    { id: 'awaiting_assignment', label: 'بانتظار التعيين', color: 'bg-amber-100 text-amber-800' },
    { id: 'in_progress', label: 'قيد الإصلاح', color: 'bg-teal-100 text-teal-800' },
    { id: 'ready_for_pickup', label: 'جاهز للتسليم', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'completed', label: 'مكتمل', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'cancelled', label: 'ملغاة / متوقفة', color: 'bg-rose-100 text-rose-800' },
  ];

  const handleAction = (app) => {
    if (app.status === 'pending') {
      updateStatusMutation.mutate({ id: app.id, data: { status: 'awaiting_assignment' } });
    }
  };

  const handleInlineAssign = (app) => {
    const mechIds = selectedMechanics[app.id];
    if (!mechIds || (Array.isArray(mechIds) && mechIds.length === 0)) return;

    const mechanicIds = Array.isArray(mechIds) ? mechIds.map(id => parseInt(id, 10)) : [parseInt(mechIds, 10)];

    // Update to under_inspection so the mechanics see "تقرير الفحص"
    updateStatusMutation.mutate(
      { id: app.id, data: { status: 'under_inspection', mechanic_ids: mechanicIds } },
      {
        onSuccess: () => {
          toast.success('تم إسناد الفنيين للمهمة بنجاح');
          setSelectedMechanics(prev => {
            const newState = { ...prev };
            delete newState[app.id];
            return newState;
          });
        }
      }
    );
  };

  const handleCancelAppointment = () => {
    if (!cancellationReason || !cancellationReason.trim()) {
      toast.error('يرجى كتابة سبب إلغاء/إيقاف العملية');
      return;
    }

    updateStatusMutation.mutate(
      { id: cancellationModalAppId, data: { status: 'cancelled', cancellation_reason: cancellationReason } },
      {
        onSuccess: () => {
          toast.success('تم نقل العملية إلى قسم المواعيد الملغاة/المتوقفة بنجاح');
          setCancellationModalAppId(null);
          setCancellationReason('');
        }
      }
    );
  };

  if (isError) {
    return (
      <div className="py-8">
        <ErrorState
          title="حدث خطأ في تحميل جدول المواعيد"
          message={getErrorMessage(error)}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['appointments'] })}
        />
      </div>
    );
  }

  const filteredAppointments = appointments.filter(a => a.status === activeFilter || (activeFilter === 'in_progress' && ['under_inspection', 'waiting_parts'].includes(a.status)));

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-500">

      {/* Row 1: Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">إدارة المواعيد</h1>
          <p className="text-slate-500 mt-2 text-sm">تتبع وإدارة المواعيد بحسب حالتها الحالية وإسناد الفنيين.</p>
        </div>
        <button
          onClick={() => setIsWalkInOpen(true)}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-teal-600/20 active:scale-95 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span>تسجيل عميل مباشر (Walk-in)</span>
        </button>
      </div>

      {/* Row 2: Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative w-full md:w-80 shrink-0">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            type="text"
            placeholder="ابحث بالعميل، الجوال، أو اللوحة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
          />
        </div>

        {/* Filter Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex gap-1 overflow-x-auto custom-scrollbar w-full md:w-max">
          {columns.map(col => {
            const count = appointments.filter(a => a.status === col.id || (col.id === 'in_progress' && ['under_inspection', 'waiting_parts'].includes(a.status))).length;
            const isActive = activeFilter === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveFilter(col.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {col.label}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-bold animate-pulse">جاري تحميل المواعيد...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            icon="event_busy"
            title="لا توجد مواعيد في هذا القسم"
            message={searchTerm ? "لم يتم العثور على أي مواعيد تطابق بحثك الحالي." : "لا توجد مواعيد مدرجة ضمن هذا التصنيف حالياً."}
          />
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {filteredAppointments.map(app => {
              const [carName, carPlate] = (app.car || '').split(' - ');
              return (
                <div key={app.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col h-full">

                  {/* Appointment Header & ID */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-md border border-slate-100">
                      #{app.id}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-4">

                    {/* Interactive Vehicle Header */}
                    <div
                      onClick={() => {
                        const vObj = {
                          id: app.vehicle_id || null,
                          make: app.vehicleMake || carName || 'غير محدد',
                          model: app.vehicleModel || '',
                          license_plate: carPlate || app.vehiclePlate || '',
                          year: app.vehicleYear || null,
                          color: app.vehicleColor || null,
                          vin: app.vehicleVin || null,
                          fuel_type: app.vehicleFuelType || null,
                          transmission: app.vehicleTransmission || null,
                          image_url: app.vehicle_image || app.vehicle_url || app.vehicle?.image_url || null,
                          isWalkInSnapshot: !app.vehicle_id,
                          walkInCustomerName: app.clientName,
                          walkInCustomerPhone: app.clientPhone,
                          problem_description: app.issue
                        };
                        setSelectedVehicle({ id: app.vehicle_id || null, vehicleObj: vObj });
                      }}
                      className="flex items-start justify-between group cursor-pointer p-2.5 -mx-2.5 rounded-2xl hover:bg-slate-50/80 transition-colors"
                      title="عرض تفاصيل المركبة"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {carName || 'مركبة غير محددة'}
                          <span className="material-symbols-outlined text-xs text-slate-300 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all">open_in_new</span>
                        </h4>
                        {carPlate && <p className="text-xs font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider">{carPlate}</p>}
                      </div>
                      <EntityImage
                        src={app.vehicle_image || app.vehicleImage || app.vehicle_url || app.vehicle?.image_url}
                        type="vehicle"
                        name={carName}
                        className="w-10 h-10 rounded-2xl bg-teal-50/80 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100/50 shadow-sm group-hover:scale-105 transition-transform"
                      />
                    </div>

                    {/* Key Details Rows */}
                    <div className="space-y-2">
                      {/* Interactive Customer Row */}
                      <div
                        onClick={() => {
                          if (app.walk_in_customer_id) {
                            setSelectedWalkInCustomerId(app.walk_in_customer_id);
                          } else if (app.client_id) {
                            setSelectedUser({ id: app.client_id, userObj: { name: app.clientName, phone: app.clientPhone, role: 'client' } });
                          } else {
                            toast.error('بيانات العميل غير متاحة حالياً');
                          }
                        }}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100/50 hover:bg-teal-50/50 hover:border-teal-100/50 cursor-pointer group transition-all"
                        title="عرض تفاصيل العميل"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-teal-600 transition-colors">person</span>
                          <span className="text-xs font-bold text-slate-500 group-hover:text-teal-700 transition-colors">العميل</span>
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-teal-800 truncate max-w-[130px] flex items-center gap-1 transition-colors">
                          {app.clientName}
                          <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                        </span>
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex items-center justify-between bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100/50">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-slate-400">event</span>
                            <span className="text-xs font-bold text-slate-500">الموعد</span>
                          </div>
                          <span className="text-sm font-bold text-primary font-mono">{formatDate(app.date)} | {formatTime(app.time)}</span>
                        </div>
                      )}

                      {app.status === 'completed' && (
                        <div className="flex items-center justify-between bg-emerald-50 px-3 py-2.5 rounded-xl border border-emerald-100/50">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-emerald-500">done_all</span>
                            <span className="text-xs font-bold text-emerald-600">الانتهاء</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-700 font-mono">{formatDate(app.date)}</span>
                        </div>
                      )}
                    </div>

                    {/* Complaint/Issue */}
                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100/50">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">build</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">الشكوى / الطلب</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed line-clamp-3">{app.issue}</p>
                    </div>

                    {/* Interactive Assigned Mechanics Display */}
                    {(app.status === 'in_progress' || app.status === 'under_inspection' || app.status === 'waiting_parts' || app.status === 'completed') && (app.mechanic_id || (app.mechanics && app.mechanics.length > 0)) && (
                      <div className="bg-teal-50/60 rounded-2xl p-3 flex flex-col gap-2 border border-teal-100/60">
                        <span className="text-[10px] text-teal-700 font-bold block mb-0.5">الفنيون المكلفون</span>
                        <div className="space-y-1.5">
                          {Array.isArray(app.mechanics) && app.mechanics.length > 0 ? (
                            app.mechanics.map(m => (
                              <div
                                key={m.id}
                                onClick={() => setSelectedUser({ id: m.id, userObj: { name: m.name, role: 'mechanic' } })}
                                className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-1.5 rounded-xl transition-all group"
                                title="عرض تفاصيل الفني"
                              >
                                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">
                                  {m.name?.charAt(0) || 'م'}
                                </div>
                                <span className="text-xs text-teal-900 font-bold group-hover:underline flex items-center gap-1">
                                  {m.name}
                                  <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                                </span>
                              </div>
                            ))
                          ) : (
                            <div
                              onClick={() => setSelectedUser({ id: app.mechanic_id, userObj: { name: mechanics.find(m => m.id == app.mechanic_id)?.name || 'فني', role: 'mechanic' } })}
                              className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-1.5 rounded-xl transition-all group"
                              title="عرض تفاصيل الفني"
                            >
                              <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">
                                {mechanics.find(m => m.id == app.mechanic_id)?.name?.charAt(0) || 'م'}
                              </div>
                              <span className="text-xs text-teal-900 font-bold group-hover:underline flex items-center gap-1">
                                {mechanics.find(m => m.id == app.mechanic_id)?.name || 'فني'}
                                <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Multi-Select Mechanic Assignment */}
                    {app.status === 'awaiting_assignment' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">اختر الفنيين للمهمة</label>
                        <MultiSelect
                          options={mechanics}
                          selectedValues={selectedMechanics[app.id] || []}
                          onChange={(vals) => setSelectedMechanics(prev => ({ ...prev, [app.id]: vals }))}
                          placeholder="حدد فني واحد أو أكثر..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions Container */}
                  <div className="mt-5 pt-4 border-t border-slate-50">
                    {app.status === 'pending' && (
                      <button
                        onClick={() => handleAction(app)}
                        disabled={updateStatusMutation.isPending}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20"
                      >
                        تأكيد الموعد
                      </button>
                    )}

                    {app.status === 'awaiting_assignment' && (
                      <button
                        onClick={() => handleInlineAssign(app)}
                        disabled={updateStatusMutation.isPending || !selectedMechanics[app.id] || (Array.isArray(selectedMechanics[app.id]) && selectedMechanics[app.id].length === 0)}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                      >
                        إسناد للفنيين المحددين
                      </button>
                    )}

                    {(app.status === 'in_progress' || app.status === 'under_inspection' || app.status === 'waiting_parts') && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailsModalAppId(app.id)}
                          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                        >
                          عرض التفاصيل
                        </button>
                        <button
                          onClick={() => {
                            setCancellationModalAppId(app.id);
                            setCancellationReason('');
                          }}
                          className="px-3 py-3 rounded-xl text-xs font-bold transition-all bg-rose-50 border border-rose-200/80 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1 shrink-0"
                          title="إلغاء وإيقاف عملية الإصلاح"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          <span>إلغاء / إيقاف</span>
                        </button>
                      </div>
                    )}

                    {app.status === 'cancelled' && (
                      <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200/60 text-right">
                        <span className="text-[10px] font-bold text-rose-700 uppercase block mb-1">سبب إلغاء/إيقاف العملية</span>
                        <p className="text-xs font-bold text-rose-900 leading-relaxed">{app.cancellation_reason || 'تم إيقاف العملية من قِبل الإدارة'}</p>
                      </div>
                    )}

                    {app.status === 'ready_for_pickup' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedInvoiceApp({ invoiceId: app.invoice_id || app.invoice?.id, appointmentId: app.id })}
                            className="flex-1 py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                            <span>الفاتورة وتسليم المركبة</span>
                          </button>
                          <button
                            onClick={() => setReworkTargetApp(app)}
                            className="px-3 py-3 rounded-xl text-xs font-bold transition-all bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 flex items-center justify-center gap-1 shrink-0"
                            title="إعادة للورشة والإصلاح (Rework)"
                          >
                            <span className="material-symbols-outlined text-[16px]">replay</span>
                            <span>إعادة للإصلاح</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {app.status === 'completed' && (
                      <div className="flex justify-between items-center gap-2">
                        <button
                          onClick={() => setDetailsModalAppId(app.id)}
                          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] bg-teal-50 text-teal-700 hover:bg-teal-100 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">description</span>
                          عرض التقرير
                        </button>
                        <button
                          onClick={() => navigate('/admin/financials')}
                          className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] bg-teal-700 text-white hover:bg-teal-800 shadow-md shadow-teal-700/20 flex items-center justify-center gap-2"
                        >
                          إنهاء وفوترة
                          <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Walk-in Registration Modal */}
      {isWalkInOpen && (
        <WalkInModal
          onClose={() => setIsWalkInOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['appointments'] })}
        />
      )}

      {/* Cancellation Modal */}
      {cancellationModalAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setCancellationModalAppId(null)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <span className="material-symbols-outlined text-2xl">error</span>
              <h3 className="text-lg font-bold text-slate-800">إلغاء / إيقاف عملية الإصلاح</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              سيتم نقل الموعد إلى قسم المواعيد الملغاة/المتوقفة وتوثيق أن عملية الإصلاح لم تكتمل.
            </p>
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-2">سبب إيقاف أو إلغاء العملية <span className="text-rose-500">*</span></label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="أدخل سبب إلغاء العملية (مثال: عدم توفر قطع غيار أساسية / اعتذار العميل)..."
                rows={4}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500 focus:bg-white transition-all font-medium text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancellationModalAppId(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                تراجع
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={updateStatusMutation.isPending}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {updateStatusMutation.isPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">do_not_disturb_on</span>
                )}
                <span>تأكيد الإلغاء والإيقاف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {detailsModalAppId && (
        <AppointmentDetailsModal
          appointmentId={detailsModalAppId}
          onClose={() => setDetailsModalAppId(null)}
        />
      )}

      {/* Vehicle Details Modal */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicleId={selectedVehicle.id}
          vehicleObj={selectedVehicle.vehicleObj}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

      {/* User / Customer / Mechanic Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          userId={selectedUser.id}
          user={selectedUser.userObj}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Walk-in Customer History Modal */}
      {selectedWalkInCustomerId && (
        <WalkInCustomerHistoryModal
          customerId={selectedWalkInCustomerId}
          isOpen={true}
          onClose={() => setSelectedWalkInCustomerId(null)}
        />
      )}

      {/* Rework Modal */}
      {reworkTargetApp && (
        <ReworkModal
          isOpen={true}
          appointment={reworkTargetApp}
          onClose={() => setReworkTargetApp(null)}
          onSubmit={({ rework_notes }) => {
            reworkMutation.mutate({ id: reworkTargetApp.id, data: { rework_notes } });
          }}
          isLoading={reworkMutation.isPending}
        />
      )}

      {/* View Invoice & Handover Modal */}
      {selectedInvoiceApp && (
        <ViewInvoiceModal
          invoiceId={selectedInvoiceApp.invoiceId}
          appointmentId={selectedInvoiceApp.appointmentId}
          onClose={() => setSelectedInvoiceApp(null)}
          onHandoverSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          }}
        />
      )}

    </div>
  );
}
