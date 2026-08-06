import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { clientAPI } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';

export default function ClientBookingPage() {
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['client', 'vehicles'],
    queryFn: clientAPI.getMyVehicles
  });

  const { data: slotsData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['appointments', 'slots'],
    queryFn: clientAPI.getAvailableSlots
  });

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const createMutation = useMutation({
    mutationFn: clientAPI.createAppointment,
    onSuccess: () => {
      setIsSuccess(true);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedService || !date) return;

    // Append service type to description since backend doesn't store service id directly
    const selectedServiceObj = slotsData?.services?.find(s => s.id === selectedService);
    const serviceTitle = selectedServiceObj ? selectedServiceObj.title : '';
    const finalDescription = `[الخدمة: ${serviceTitle}]\n${description}`;

    createMutation.mutate({
      vehicle_id: selectedVehicle,
      appointment_date: date,
      description: finalDescription
    });
  };

  if (isLoadingVehicles || isLoadingSlots) return <PageLoader />;

  if (isSuccess) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
          <span className="material-symbols-outlined text-5xl text-teal-500">check_circle</span>
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-4">تم حجز الموعد بنجاح!</h2>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
          لقد تلقينا طلبك. سيقوم فريقنا بمراجعته وتأكيده في أقرب وقت ممكن. يمكنك متابعة حالة الموعد من خلال شاشة "سجل المواعيد".
        </p>
        <button 
          onClick={() => { setIsSuccess(false); setSelectedVehicle(''); setSelectedService(''); setDescription(''); setDate(''); }}
          className="mt-10 px-8 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl transition-all duration-300"
        >
          حجز موعد آخر
        </button>
      </div>
    );
  }

  const services = slotsData?.services || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">حجز موعد صيانة</h1>
        <p className="text-slate-500 mt-2 text-sm">احجز موعداً لصيانة مركبتك في خطوات بسيطة.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-10 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-10">
        
        {createMutation.isError && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold">
            حدث خطأ أثناء حجز الموعد. يرجى المحاولة مرة أخرى.
          </div>
        )}

        {/* Vehicle Selection */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <span className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 text-xs">1</span>
            اختر المركبة
          </label>
          {vehicles.length === 0 ? (
            <div className="pl-8 text-sm text-slate-500">لا توجد مركبات مسجلة. يرجى إضافة مركبة أولاً من صفحة مركباتي.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
              {vehicles.map(v => (
                <label 
                  key={v.id} 
                  className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all duration-300 ${selectedVehicle === v.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                >
                  <input 
                    type="radio" 
                    name="vehicle" 
                    className="hidden"
                    checked={selectedVehicle === v.id}
                    onChange={() => setSelectedVehicle(v.id)}
                    required
                  />
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedVehicle === v.id ? 'bg-white text-primary shadow-sm' : 'bg-white text-slate-400 shadow-sm'}`}>
                      <span className="material-symbols-outlined">directions_car</span>
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${selectedVehicle === v.id ? 'text-primary' : 'text-slate-600'}`}>
                        {v.make} {v.model}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{v.plateNumber}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Service Type Selection */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <span className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 text-xs">2</span>
            نوع الخدمة
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-8">
            {services.map(s => (
              <label 
                key={s.id} 
                className={`flex flex-col items-center justify-center p-6 border rounded-2xl cursor-pointer transition-all duration-300 ${selectedService === s.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
              >
                <input 
                  type="radio" 
                  name="service" 
                  className="hidden"
                  checked={selectedService === s.id}
                  onChange={() => setSelectedService(s.id)}
                  required
                />
                <span className={`material-symbols-outlined text-3xl mb-3 ${selectedService === s.id ? 'text-primary' : 'text-slate-400'}`}>
                  {s.icon}
                </span>
                <span className={`font-bold text-sm text-center ${selectedService === s.id ? 'text-primary' : 'text-slate-600'}`}>
                  {s.title}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Date and Description */}
        <div className="space-y-6">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <span className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 text-xs">3</span>
            التفاصيل والموعد
          </label>
          <div className="pl-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">التاريخ المفضل</label>
              <input 
                type="date" 
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full md:w-1/2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">وصف المشكلة (اختياري)</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="صف المشكلة التي تواجهها باختصار..."
                className="w-full h-32 px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pl-8 pt-4">
          <button 
            type="submit"
            disabled={createMutation.isPending || vehicles.length === 0}
            className="w-full md:w-auto px-10 py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                جاري تأكيد الحجز...
              </>
            ) : (
              'تأكيد الحجز'
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
