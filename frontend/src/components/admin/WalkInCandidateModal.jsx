import { useState } from 'react';
import { walkInAPI, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

export default function WalkInCandidateModal({ candidates, initialData, onSuccess, onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResolve = async (candidate, resolution) => {
    setIsSubmitting(true);
    try {
      const candidateId = candidate ? (candidate.id || candidate.customerId || candidate.userId) : null;
      const isPermanentUser = candidate ? !!candidate.isPermanentUser : false;
      const payload = {
        existing_customer_id: candidateId,
        is_permanent_user: isPermanentUser,
        decision: resolution,
        customer: {
          name: initialData.name,
          phone: initialData.phone,
          notes: initialData.notes
        },
        visit: {
          vehicle_make: initialData.vehicle_make,
          vehicle_model: initialData.vehicle_model,
          vehicle_year: initialData.vehicle_year,
          vehicle_license_plate: initialData.license_plate,
          vehicle_vin: initialData.vehicle_vin,
          vehicle_color: initialData.vehicle_color,
          problem_description: initialData.problem_description,
          odometer: initialData.odometer
        }
      };
      const res = await walkInAPI.resolveCandidate(payload);
      toast.success(res.message || 'تم الربط وإكمال الزيارة بنجاح');
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">person_search</span>
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-lg">تأكيد هوية العميل السابق</h3>
              <p className="text-xs text-amber-700 font-medium">تم العثور على عميل سابق يتطابق مع البيانات المدخلة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-amber-900 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">البيانات المدخلة حالياً:</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-bold block">الاسم:</span>
                <span className="font-bold text-slate-800">{initialData.name || 'غير محدد'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold block">رقم الجوال:</span>
                <span className="font-mono font-bold text-slate-800">{initialData.phone || 'غير محدد'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-base">groups</span>
              العملاء المتطابقون في النظام:
            </h4>

            {candidates.map((c) => {
              const candId = c.id || c.customerId || c.userId;
              const isPerm = c.isPermanentUser;
              const matchSignal = c.matchSignal || (c.matchType === 'permanent_user_phone' ? 'عميل مسجل بالمنصة (نفس الهاتف)' : c.matchType === 'phone_and_name' ? 'تطابق الاسم والهاتف' : c.matchType === 'same_phone_different_name' ? 'تطابق رقم الهاتف' : 'تطابق جزئي');
              return (
                <div
                  key={`${isPerm ? 'user' : 'walkin'}-${candId}`}
                  className={`p-4 rounded-2xl border-2 shadow-sm space-y-3 transition-all ${isPerm ? 'bg-teal-50/50 border-teal-200 hover:border-teal-400' : 'bg-white border-amber-200 hover:border-amber-400'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${isPerm ? 'bg-teal-100 text-teal-900' : 'bg-amber-100 text-amber-900'}`}>
                          #{candId} {isPerm && `• حساب دائم (${c.role === 'admin' ? 'مدير' : c.role === 'super_admin' ? 'Super Admin' : c.role === 'mechanic' ? 'ميكانيكي' : 'عميل دائم'})`}
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-800 text-base mt-1">{c.name}</h5>
                      <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">{c.phone}</p>
                    </div>
                    {matchSignal && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${isPerm ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                        {matchSignal}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">هل هو نفس هذا العميل؟</p>
                    <button
                      onClick={() => handleResolve(c, 'same_customer')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      نعم، هذا نفس العميل
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 mb-3">إذا لم يكن العميل أي شخص من القائمة أعلاه:</p>
            <button
              onClick={() => handleResolve(null, 'different_customer')}
              disabled={isSubmitting}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors active:scale-95 disabled:opacity-50"
            >
              لا، عميل مختلف تماماً (إنشاء سجل جديد)
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
