import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export default function ClientVehiclesPage() {
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading, isError } = useQuery({
    queryKey: ['client', 'vehicles'],
    queryFn: clientAPI.getMyVehicles
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Form State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vin, setVin] = useState('');

  const createMutation = useMutation({
    mutationFn: clientAPI.createVehicle,
    onSuccess: () => {
      toast.success('تمت إضافة المركبة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['client', 'vehicles'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء إضافة المركبة'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => clientAPI.updateVehicle(id, data),
    onSuccess: () => {
      toast.success('تم تعديل بيانات المركبة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['client', 'vehicles'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء تعديل المركبة'));
    }
  });

  const openModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setMake(vehicle.make);
      setModel(vehicle.model);
      setYear(vehicle.year);
      setPlateNumber(vehicle.plateNumber);
      setVin(vehicle.vin || '');
    } else {
      setEditingVehicle(null);
      setMake('');
      setModel('');
      setYear('');
      setPlateNumber('');
      setVin('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { make, model, year, license_plate: plateNumber, vin };
    
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <PageLoader />;

  if (isError) return (
    <div className="py-8">
      <ErrorState
        title="حدث خطأ في تحميل مركباتك"
        message={getErrorMessage(error)}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['client', 'vehicles'] })}
      />
    </div>
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">مركباتي</h1>
          <p className="text-slate-500 mt-2 text-sm">إدارة مركباتك المسجلة وحالة صيانتها.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          إضافة مركبة
        </button>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon="directions_car"
              title="لا توجد مركبات مسجلة"
              message="قم بإضافة مركبتك الأولى للبدء في طلب خدمات الصيانة والتأكد من متابعتها."
              actionLabel="إضافة مركبة الآن"
              onAction={() => openModal()}
            />
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div 
              key={vehicle.id} 
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{vehicle.make} {vehicle.model}</h3>
                  <p className="text-sm text-slate-500 mt-1">{vehicle.year}</p>
                </div>
                <button
                  onClick={() => openModal(vehicle)}
                  className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
              </div>

              {/* License Plate Stylized */}
              <div className="mt-auto mb-6 bg-slate-50 rounded-2xl p-4 flex items-center justify-center border border-slate-200">
                <span className="font-mono font-bold text-lg text-slate-700 tracking-widest uppercase">
                  {vehicle.plateNumber}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-50 pt-4">
                <span>VIN:</span>
                <span className="font-mono">{vehicle.vin || 'غير محدد'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Soft Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={closeModal} />
          
          <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-800">
                {editingVehicle ? 'تعديل بيانات المركبة' : 'إضافة مركبة جديدة'}
              </h2>
              <button 
                onClick={closeModal} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              {(createMutation.isError || updateMutation.isError) && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-bold">
                  حدث خطأ أثناء حفظ البيانات
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">الشركة المصنعة</label>
                  <input
                    required
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="تويوتا"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">الموديل</label>
                  <input
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="كامري"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">سنة الصنع</label>
                  <input
                    required
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">رقم اللوحة</label>
                  <input
                    required
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="ABC 1234"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left uppercase font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">رقم الهيكل (VIN)</label>
                <input
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="أدخل الـ 17 حرف/رقم"
                  maxLength={17}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left uppercase font-mono"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 flex justify-center items-center gap-2 bg-primary text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70"
                >
                  {isPending ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  ) : null}
                  {editingVehicle ? 'حفظ التعديلات' : 'إضافة المركبة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
