import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { walkInAPI, getErrorMessage } from '../../services/api';
import WalkInCandidateModal from './WalkInCandidateModal';
import toast from 'react-hot-toast';

export default function WalkInModal({ onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_license_plate: '',
    license_plate: '',
    vehicle_vin: '',
    vehicle_color: '',
    vehicle_transmission: '',
    vehicle_fuel_type: '',
    odometer: '',
    problem_description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [candidateMatches, setCandidateMatches] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.vehicle_make || !formData.license_plate || !formData.problem_description) {
      toast.error('يرجى تعبئة كافة الحقول المطلوبة');
      return;
    }

    const cleanPhone = formData.phone.trim();
    if (!/^7\d{8}$/.test(cleanPhone)) {
      toast.error('يرجى إدخال رقم جوال يمني صحيح مكون من 9 أرقام يبدأ بـ 7 (مثال: 771234567)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        vehicle_license_plate: formData.license_plate || formData.vehicle_license_plate
      };
      const res = await walkInAPI.createWithVisit(payload);
      toast.success(res.message || 'تم تسجيل زيارة العميل المباشر بنجاح');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['walkInCustomers'] });
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      const candidates = err.response?.data?.matches || err.response?.data?.candidates;
      if (err.response && err.response.status === 409 && candidates && candidates.length > 0) {
        setCandidateMatches(candidates);
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

        {/* Modal Window */}
        <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          
          {/* Header */}
          <div className="px-6 py-5 bg-teal-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">person_add_alt</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">تسجيل عميل مباشر (Walk-in)</h3>
                <p className="text-xs text-teal-100 font-medium">تسجيل استقبال مركبة بدون حساب تسجيل دخول للعميل</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* Section 1: Customer Details */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-teal-600 text-base">person</span>
                بيانات العميل
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="أدخل الاسم الكامل"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-600 focus:bg-white outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="771234567"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:border-teal-600 focus:bg-white outline-none font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Vehicle Details */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-teal-600 text-base">directions_car</span>
                بيانات المركبة الهوية
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ماركة / الشركة المصنعة *</label>
                  <input
                    type="text"
                    name="vehicle_make"
                    value={formData.vehicle_make}
                    onChange={handleChange}
                    placeholder="مثال: تويوتا، هيونداي"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-600 focus:bg-white outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">الموديل</label>
                  <input
                    type="text"
                    name="vehicle_model"
                    value={formData.vehicle_model}
                    onChange={handleChange}
                    placeholder="مثال: كامري، كورولا"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-600 focus:bg-white outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">سنة الصنع</label>
                  <input
                    type="number"
                    name="vehicle_year"
                    value={formData.vehicle_year}
                    onChange={handleChange}
                    placeholder="مثال: 2023"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:border-teal-600 focus:bg-white outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">رقم اللوحة *</label>
                  <input
                    type="text"
                    name="license_plate"
                    value={formData.license_plate}
                    onChange={handleChange}
                    placeholder="أ ب ج 1234"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:border-teal-600 focus:bg-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">رقم الهيكل (VIN)</label>
                  <input
                    type="text"
                    name="vehicle_vin"
                    value={formData.vehicle_vin}
                    onChange={handleChange}
                    placeholder="أدخل الـ 17 حرف/رقم"
                    maxLength={17}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:border-teal-600 focus:bg-white outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">اللون</label>
                  <input
                    type="text"
                    name="vehicle_color"
                    value={formData.vehicle_color}
                    onChange={handleChange}
                    placeholder="أسود، أبيض..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-600 focus:bg-white outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ناقل الحركة</label>
                  <select
                    name="vehicle_transmission"
                    value={formData.vehicle_transmission}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-600 focus:bg-white outline-none font-medium"
                  >
                    <option value="">اختر ناقل الحركة</option>
                    <option value="أوتوماتيك">أوتوماتيك</option>
                    <option value="يدوي">يدوي (عادي)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">نوع الوقود</label>
                  <select
                    name="vehicle_fuel_type"
                    value={formData.vehicle_fuel_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-600 focus:bg-white outline-none font-medium"
                  >
                    <option value="">اختر نوع الوقود</option>
                    <option value="بنزين">بنزين</option>
                    <option value="ديزل">ديزل</option>
                    <option value="هجين (Hybrid)">هجين (Hybrid)</option>
                    <option value="كهربائي">كهربائي</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">قراءة العداد (كم)</label>
                  <input
                    type="number"
                    name="odometer"
                    value={formData.odometer}
                    onChange={handleChange}
                    placeholder="125000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:border-teal-600 focus:bg-white outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Visit Details */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-teal-600 text-base">build</span>
                وصف الشكوى والمطلوب *
              </h4>
              <textarea
                name="problem_description"
                value={formData.problem_description}
                onChange={handleChange}
                rows={3}
                placeholder="صف العطل أو الخدمة المطلوبة من العميل..."
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-teal-600 focus:bg-white outline-none font-medium resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-teal-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    <span>جاري التسجيل...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>تسجيل الزيارة والإنشاء</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* Walk-in Candidate Matching Modal */}
      {candidateMatches && (
        <WalkInCandidateModal
          candidates={candidateMatches}
          initialData={formData}
          onSuccess={(res) => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['walkInCustomers'] });
            if (onSuccess) onSuccess(res);
            onClose();
          }}
          onClose={() => setCandidateMatches(null)}
        />
      )}
    </>
  );
}
