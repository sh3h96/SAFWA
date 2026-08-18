import { useState } from 'react';
import LicensePlate from '../../components/common/LicensePlate';
import { bookingResponse } from '../../mock/admin/booking';
import toast from 'react-hot-toast';

export default function BookingWizardPage() {
  const [data] = useState(bookingResponse);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState(data.vehicles[0].id);
  const [selectedServiceId, setSelectedServiceId] = useState(data.services[0].id);
  const [issueDescription, setIssueDescription] = useState('');
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(data.availableTimeSlots[1]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSuccess(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Top Header Title */}
      <div className="border-b border-border-slate pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-on-background">حجز موعد خدمة جديد</h1>
          <p className="text-sm text-secondary mt-1">قم بتحديد المركبة والخدمة المطلوبة وحجز الموعد المناسب.</p>
        </div>

        {isSuccess && (
          <span className="bg-success-bg text-success-text px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>تم التأكيد</span>
          </span>
        )}
      </div>

      {/* Wizard Progress Header */}
      <div className="bg-white border border-border-slate rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-surface-container -translate-y-1/2 z-0" />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-4">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
              currentStep >= 1 ? 'border-primary-container bg-primary-container text-white shadow' : 'border-outline-variant text-outline bg-white'
            }`}>
              ١
            </div>
            <span className={`text-xs font-bold ${currentStep >= 1 ? 'text-primary-container' : 'text-outline'}`}>
              تحديد السيارة والخدمة
            </span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-4">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
              currentStep >= 2 ? 'border-primary-container bg-primary-container text-white shadow' : 'border-outline-variant text-outline bg-white'
            }`}>
              ٢
            </div>
            <span className={`text-xs font-bold ${currentStep >= 2 ? 'text-primary-container' : 'text-outline'}`}>
              اختيار التاريخ والوقت
            </span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-4">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
              currentStep >= 3 ? 'border-primary-container bg-primary-container text-white shadow' : 'border-outline-variant text-outline bg-white'
            }`}>
              ٣
            </div>
            <span className={`text-xs font-bold ${currentStep >= 3 ? 'text-primary-container' : 'text-outline'}`}>
              تأكيد الحجز
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Success Banner */}
      {isSuccess ? (
        <div className="bg-success-bg border-2 border-success-text/30 rounded-xl p-8 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-success-text text-white rounded-full flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-3xl">task_alt</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface">تم إرسال حجزك بنجاح!</h2>
          <p className="text-sm text-secondary max-w-md mx-auto">
            تم تسجيل موعد الصيانة الخاص بك وسيتم التواصل معك من قبل فريق الاستقبال لتأكيد الحجز.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <button 
              onClick={() => { setIsSuccess(false); setCurrentStep(1); }}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-hover transition-all"
            >
              حجز موعد آخر
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Step 1 & Step 2 Content */}
          <div className="space-y-10">
            {/* Section 1: Vehicle Selection */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">directions_car</span>
                <h2 className="font-bold text-lg text-on-surface">اختر المركبة</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.vehicles.map((veh) => {
                  const isSelected = veh.id === selectedVehicleId;
                  return (
                    <div 
                      key={veh.id}
                      onClick={() => setSelectedVehicleId(veh.id)}
                      className={`p-6 bg-white border rounded-xl transition-all cursor-pointer flex flex-col gap-4 shadow-sm ${
                        isSelected 
                          ? 'border-primary-container bg-teal-50/50 ring-2 ring-primary-container/20' 
                          : 'border-border-slate hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-base text-on-surface">{veh.model}</h3>
                          <p className="text-xs text-on-surface-variant mt-1">
                            تاريخ آخر صيانة: {veh.lastServiceDate}
                          </p>
                        </div>
                        <span className={`material-symbols-outlined text-xl ${
                          isSelected ? 'text-primary' : 'text-outline-variant'
                        }`}>
                          {isSelected ? 'check_circle' : 'circle'}
                        </span>
                      </div>

                      <div className="bg-surface-container-low border border-outline-variant px-4 py-2 rounded-lg flex items-center justify-center">
                        <LicensePlate plateNumber={veh.plateNumber} variant="compact" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 2: Service Selection */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">build</span>
                <h2 className="font-bold text-lg text-on-surface">نوع الخدمة</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.services.map((srv) => {
                  const isSelected = srv.id === selectedServiceId;
                  return (
                    <button 
                      key={srv.id}
                      onClick={() => setSelectedServiceId(srv.id)}
                      className={`p-6 bg-white border rounded-xl transition-all flex flex-col items-center gap-3 text-center active:scale-95 shadow-sm ${
                        isSelected 
                          ? 'border-primary-container bg-success-bg/40 text-primary font-bold shadow' 
                          : 'border-border-slate hover:border-primary-container hover:bg-surface-container-low'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-3xl ${
                        isSelected ? 'text-primary' : 'text-secondary'
                      }`}>
                        {srv.icon}
                      </span>
                      <span className="text-sm text-on-surface font-bold">{srv.title}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Section 3: Issue Details */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">description</span>
                <h2 className="font-bold text-lg text-on-surface">تفاصيل المشكلة</h2>
              </div>

              <div className="bg-white border border-border-slate p-6 rounded-xl space-y-4 shadow-sm">
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">وصف المشكلة</label>
                  <textarea 
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="يرجى كتابة تفاصيل العطل أو الأعراض التي تظهر على المركبة..."
                    className="w-full h-32 p-4 bg-white border border-border-slate rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <button className="w-full sm:w-auto px-5 py-2.5 border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors text-xs font-bold">
                    <span className="material-symbols-outlined text-base">attach_file</span>
                    <span>إرفاق ملفات (صور أو مقطع صوتي)</span>
                  </button>
                  <p className="text-xs text-outline">الحد الأقصى للملف 10 ميجابايت</p>
                </div>
              </div>
            </section>

            {/* Section 4: Date & Time Picker */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                <h2 className="font-bold text-lg text-on-surface">التاريخ والوقت المفضل</h2>
              </div>

              <div className="bg-white border border-border-slate p-6 rounded-xl space-y-6 shadow-sm">
                {/* Dates horizontal scroll */}
                <div className="flex gap-4 overflow-x-auto pb-2 scroll-hide">
                  {data.availableDates.map((dateObj, idx) => {
                    const isSelected = idx === selectedDateIndex;
                    return (
                      <button 
                        key={idx}
                        onClick={() => setSelectedDateIndex(idx)}
                        className={`shrink-0 w-24 py-4 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          isSelected 
                            ? 'border-primary-container bg-success-bg shadow-sm' 
                            : 'border-border-slate hover:border-outline bg-white'
                        }`}
                      >
                        <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>
                          {dateObj.dayName}
                        </span>
                        <span className={`text-xl font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                          {dateObj.dayNumber}
                        </span>
                        <span className="text-xs text-on-surface-variant">{dateObj.month}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Time Slots grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.availableTimeSlots.map((slot) => {
                    const isSelected = slot === selectedTimeSlot;
                    return (
                      <button 
                        key={slot}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-3 rounded-lg text-sm font-bold data-mono transition-all ${
                          isSelected 
                            ? 'border-2 border-primary-container bg-success-bg text-primary shadow-sm' 
                            : 'border border-border-slate text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* Action Footer Buttons */}
          <div className="pt-6 border-t border-border-slate flex justify-between items-center">
            <button 
              onClick={handleNextStep}
              className="px-8 py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-teal-hover active:scale-95 transition-all shadow-md"
            >
              <span>{currentStep === 3 ? 'إرسال الحجز' : 'التالي'}</span>
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>

            {currentStep > 1 ? (
              <button 
                onClick={handlePrevStep}
                className="px-6 py-3 text-secondary hover:text-on-surface transition-colors font-medium text-sm"
              >
                السابق
              </button>
            ) : (
              <button 
                onClick={() => toast.error('تم إلغاء الحجز')}
                className="px-6 py-3 text-secondary hover:text-danger-text transition-colors font-medium text-sm"
              >
                إلغاء
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
