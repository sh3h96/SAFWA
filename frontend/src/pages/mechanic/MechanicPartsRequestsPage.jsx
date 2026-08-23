import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requiredPartsAPI, mechanicAPI, inventoryAPI } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';

export default function MechanicPartsRequestsPage() {
  const queryClient = useQueryClient();

  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Fetch mechanic's assigned tasks (appointments)
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['mechanic', 'tasks'],
    queryFn: mechanicAPI.getTasks,
  });

  // Fetch inventory catalog
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryAPI.getAll(''),
  });

  // Fetch mechanic's submitted parts requests
  const { data: myRequests = [], isLoading: isLoadingRequests, isError: isRequestsError } = useQuery({
    queryKey: ['mechanicPartsRequests'],
    queryFn: () => requiredPartsAPI.getAll(),
  });

  const submitMutation = useMutation({
    mutationFn: requiredPartsAPI.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mechanicPartsRequests'] });
      queryClient.invalidateQueries({ queryKey: ['mechanic', 'tasks'] });
      setFormSuccess('تم تقديم طلب قطعة الغيار بنجاح!');
      setFormError(null);
      setSelectedPartId('');
      setQuantity(1);
    },
    onError: (err) => {
      setFormError(err?.response?.data?.message || 'فشل تقديم طلب قطع الغيار.');
      setFormSuccess(null);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedAppointmentId) {
      setFormError('يرجى اختيار المركبة/الموعد المخصص لك.');
      return;
    }
    if (!selectedPartId) {
      setFormError('يرجى اختيار قطعة الغيار المطلوبة.');
      return;
    }
    if (quantity < 1) {
      setFormError('الكمية المطلوبة يجب أن تكون 1 على الأقل.');
      return;
    }

    submitMutation.mutate({
      appointment_id: selectedAppointmentId,
      parts: [{ id: Number(selectedPartId), qty: Number(quantity) }]
    });
  };

  const inventoryItems = inventoryData?.items || [];
  const requestsList = Array.isArray(myRequests) ? myRequests : [];

  if (isLoadingTasks || isLoadingInventory || isLoadingRequests) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">طلبات قطع الغيار</h1>
        <p className="text-slate-500 mt-1 text-sm">متابعة حالة طلبات القطع الخاصة بالسيارات المخصصة لك وتقديم طلبات جديدة.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">add_shopping_cart</span>
            <span>تقديم طلب جديد</span>
          </h2>

          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Select Appointment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">المركبة / الموعد المخصص</label>
              <select
                value={selectedAppointmentId}
                onChange={(e) => setSelectedAppointmentId(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700"
              >
                <option value="">-- اختر السيارة المخصصة --</option>
                {tasks.map(t => (
                  <option key={t.appointment_id || t.id} value={t.appointment_id || t.id}>
                    {t.vehicle || t.car} ({t.plate || t.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Spare Part */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">قطعة الغيار</label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium text-slate-700"
              >
                <option value="">-- اختر قطعة الغيار --</option>
                {inventoryItems.map(part => (
                  <option key={part.id} value={part.id} disabled={part.stock <= 0}>
                    {part.name} - SKU: {part.sku} (المتوفر: {part.stock})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">الكمية المطلوبة</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono text-left font-bold text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitMutation.isPending ? 'جاري الإرسال...' : 'إرسال طلب القطعة'}
            </button>
          </form>
        </div>

        {/* Requests Status Table Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            <span>سجل الطلبات الخاصة بك</span>
          </h2>

          {isRequestsError ? (
            <div className="p-6 bg-rose-50 text-rose-700 rounded-3xl text-center text-sm font-bold">
              حدث خطأ أثناء تحميل سجل طلبات القطع.
            </div>
          ) : requestsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
              <p className="text-slate-600 font-bold text-sm">لم تقم بتقديم أي طلبات قطع غيار حتى الآن</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">اسم القطعة</th>
                      <th className="py-4 px-6">السيارة</th>
                      <th className="py-4 px-6 text-center">الكمية</th>
                      <th className="py-4 px-6 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {requestsList.map((reqItem) => (
                      <tr key={reqItem.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-800">
                          {reqItem.part_name}
                          <span className="block text-xs font-mono text-slate-400 font-normal">SKU: {reqItem.sku}</span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-600 font-bold">
                          {reqItem.vehicle_info}
                        </td>
                        <td className="py-4 px-6 text-center font-mono font-bold text-slate-800">
                          {reqItem.quantity}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {reqItem.status === 'pending' && (
                            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                              بانتظار موافقة الإدارة
                            </span>
                          )}
                          {reqItem.status === 'approved' && (
                            <div className="flex items-center justify-center gap-2">
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                                معتمد - جاهز للتركيب
                              </span>
                              <button
                                onClick={() => {
                                  requiredPartsAPI.installPart(reqItem.id).then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['mechanicPartsRequests'] });
                                    queryClient.invalidateQueries({ queryKey: ['mechanic', 'tasks'] });
                                  });
                                }}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all"
                              >
                                تركيب القطعة
                              </button>
                            </div>
                          )}
                          {reqItem.status === 'installed' && (
                            <span className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-xs font-bold">
                              تم تركيب القطعة
                            </span>
                          )}
                          {reqItem.status === 'rejected' && (
                            <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold">
                              مرفوض
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
