import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsAPI, usersAPI, getErrorMessage } from '../../services/api';
import SearchInput from '../../components/ui/SearchInput';
import LicensePlate from '../../components/common/LicensePlate';
import StatusBadge from '../../components/common/StatusBadge';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import ReassignBayModal from '../../components/workshop/ReassignBayModal';
import toast from 'react-hot-toast';

export default function WorkshopDispatcherPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMechanicMap, setSelectedMechanicMap] = useState({});

  // Reassign Modal state
  const [editingApp, setEditingApp] = useState(null);
  const [modalMechanicIds, setModalMechanicIds] = useState([]);
  const [modalStatus, setModalStatus] = useState('under_inspection');

  // Fetch real appointments
  const { data: appointments = [], isLoading: isLoadingAppointments, isError: isAppError, error: appError } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsAPI.getAll('')
  });

  // Fetch real mechanics
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getAll('')
  });

  const mechanics = allUsers.filter(u => u.role === 'mechanic');

  // Mutation to update status and mechanic assignments
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appointmentsAPI.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('تم تحديث توزيع المنصة بنجاح');
      setEditingApp(null);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });

  // Filter unassigned appointments (pending or awaiting_assignment)
  const unassignedAppointments = appointments.filter(a =>
    ['pending', 'awaiting_assignment'].includes(a.status)
  ).filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      (a.car || '').toLowerCase().includes(q) ||
      (a.clientName || '').toLowerCase().includes(q) ||
      (a.issue || '').toLowerCase().includes(q)
    );
  });

  // Active bay appointments (under_inspection, in_progress, waiting_parts, ready_for_pickup)
  const activeBayAppointments = appointments.filter(a =>
    ['under_inspection', 'in_progress', 'waiting_parts', 'ready_for_pickup'].includes(a.status)
  );

  // Dispatch unassigned appointment to mechanic(s)
  const handleDispatch = (appId) => {
    const selected = selectedMechanicMap[appId];
    if (!selected || (Array.isArray(selected) && selected.length === 0)) {
      toast.error('يرجى اختيار فني واحد على الأقل للمهمة');
      return;
    }

    const mechIds = Array.isArray(selected)
      ? selected.map(id => Number(id))
      : [Number(selected)];

    updateMutation.mutate({
      id: appId,
      data: {
        status: 'under_inspection',
        mechanic_ids: mechIds
      }
    });
  };

  // Open Reassign Modal for active bay appointment
  const handleOpenModal = (app) => {
    setEditingApp(app);
    const existingIds = app.mechanics && app.mechanics.length > 0
      ? app.mechanics.map(m => m.id)
      : (app.mechanic ? [app.mechanic.id] : []);
    setModalMechanicIds(existingIds);
    setModalStatus(app.status || 'under_inspection');
  };

  // Submit modal changes
  const handleSaveModalChanges = () => {
    if (!editingApp) return;
    if (modalMechanicIds.length === 0) {
      toast.error('يرجى اختيار فني واحد على الأقل للمهمة');
      return;
    }

    updateMutation.mutate({
      id: editingApp.id,
      data: {
        status: modalStatus,
        mechanic_ids: modalMechanicIds.map(id => Number(id))
      }
    });
  };

  if (isLoadingAppointments || isLoadingUsers) {
    return <PageLoader />;
  }

  if (isAppError) {
    return (
      <div className="py-8">
        <ErrorState
          title="تعذر تحميل بيانات توزيع الورشة"
          message={getErrorMessage(appError)}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['appointments'] })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto w-full animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">توزيع منصات الخدمة (Workshop Dispatcher)</h1>
          <p className="text-sm text-slate-500 mt-1">
            إدارة فورية وتوزيع طلبات الصيانة على رافعين وفنيين الورشة
          </p>
        </div>
      </div>

      {/* Main Grid & Panel Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar: Unassigned Appointments */}
        <aside className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-800">بانتظار التوزيع</h3>
            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {unassignedAppointments.length}
            </span>
          </div>

          <SearchInput 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بمركبة أو عميل..."
          />

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {unassignedAppointments.map((app) => {
              const [carName, carPlate] = (app.car || '').split(' - ');
              const selectedVal = selectedMechanicMap[app.id] || '';

              return (
                <div 
                  key={app.id} 
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-primary transition-all space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{carName || app.car}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">العميل: {app.clientName}</p>
                    </div>
                    {carPlate && <LicensePlate plateNumber={carPlate} variant="compact" />}
                  </div>

                  <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 font-medium">
                    <span className="font-bold block text-slate-700 mb-0.5">الشكوى:</span>
                    {app.issue}
                  </div>

                  {/* Multi-Mechanic Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">تعيين الفني / الفنيين</label>
                    <select
                      multiple
                      value={Array.isArray(selectedVal) ? selectedVal : (selectedVal ? [selectedVal] : [])}
                      onChange={(e) => {
                        const opts = Array.from(e.target.selectedOptions, option => option.value);
                        setSelectedMechanicMap(prev => ({ ...prev, [app.id]: opts }));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-medium h-20"
                    >
                      {mechanics.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.status === 'active' ? 'نشط' : 'غير نشط'})
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 block">اضغط Ctrl/Cmd لتحديد أكثر من فني</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {app.date} | {app.time}
                    </span>
                    <button 
                      onClick={() => handleDispatch(app.id)}
                      disabled={updateMutation.isPending}
                      className="px-4 py-1.5 bg-primary text-white hover:bg-primary/90 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {updateMutation.isPending ? 'جاري...' : 'توزيع'}
                    </button>
                  </div>
                </div>
              );
            })}

            {unassignedAppointments.length === 0 && (
              <EmptyState
                icon="check_circle"
                title="لا توجد مواعيد بانتظار التوزيع"
                message="جميع المواعيد تم إسنادها وتوزيعها على الفنيين بالورشة."
              />
            )}
          </div>
        </aside>

        {/* Main Workshop Bays Grid */}
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
            <h3 className="font-bold text-base text-slate-800">منصات الخدمة النشطة</h3>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
              {activeBayAppointments.length} منصة تعمل
            </span>
          </div>

          {activeBayAppointments.length === 0 ? (
            <EmptyState
              icon="build_circle"
              title="لا توجد منصات صيانة نشطة حالياً"
              message="قم بتوزيع الفنيين على المواعيد بانتظار التوزيع لبدء العمل في الورشة."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeBayAppointments.map((app, index) => {
                const [carName, carPlate] = (app.car || '').split(' - ');
                const statusLabels = {
                  under_inspection: { label: 'قيد الفحص', variant: 'warning' },
                  in_progress: { label: 'قيد الإصلاح', variant: 'info' },
                  waiting_parts: { label: 'بانتظار قطع الغيار', variant: 'danger' },
                  ready_for_pickup: { label: 'جاهز للاستلام', variant: 'success' }
                };
                const st = statusLabels[app.status] || { label: app.status, variant: 'default' };

                return (
                  <div 
                    key={app.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative space-y-4"
                  >
                    {/* Action Menu */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-slate-800">{carName || app.car}</h3>
                          <span className="text-xs text-slate-500">العميل: {app.clientName}</span>
                        </div>
                      </div>
                      <StatusBadge variant={st.variant} label={st.label} />
                    </div>

                    {/* Vehicle Details */}
                    <div className="flex items-center justify-between">
                      {carPlate ? <LicensePlate plateNumber={carPlate} /> : <div />}
                      <span className="text-xs font-mono bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100">
                        {app.id}
                      </span>
                    </div>

                    {/* Assigned Mechanics */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-slate-600 block">الفنيون المكلفون:</span>
                      {app.mechanics && app.mechanics.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {app.mechanics.map(m => (
                            <span key={m.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-teal-500" />
                              {m.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">غير محدد</span>
                      )}
                    </div>

                    {/* Issue snippet */}
                    <div className="text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-500 block mb-0.5">وصف الشكوى:</span>
                      {app.issue}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 flex justify-end">
                      <button 
                        onClick={() => handleOpenModal(app)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        تعديل التوزيع والحالة
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Reassign Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setEditingApp(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-6 z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">تعديل تعيين الموعد #{editingApp.id}</h3>
              <button onClick={() => setEditingApp(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Mechanic Multi Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">الفنيون المكلفون</label>
                <select
                  multiple
                  value={modalMechanicIds.map(String)}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions, option => Number(option.value));
                    setModalMechanicIds(opts);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700 h-32"
                >
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">يمكن تحديد أكثر من فني بالضغط على Ctrl/Cmd</span>
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">الحالة الجديدة</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700"
                >
                  <option value="under_inspection">قيد الفحص (under_inspection)</option>
                  <option value="in_progress">قيد الإصلاح (in_progress)</option>
                  <option value="waiting_parts">بانتظار قطع الغيار (waiting_parts)</option>
                  <option value="ready_for_pickup">جاهز للاستلام (ready_for_pickup)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveModalChanges}
                disabled={updateMutation.isPending}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button
                onClick={() => setEditingApp(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
