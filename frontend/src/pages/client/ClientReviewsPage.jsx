import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { clientAPI, getErrorMessage } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import toast from 'react-hot-toast';

export default function ClientReviewsPage() {
  const { data: appointmentsRaw = [], isLoading, isError, error } = useQuery({
    queryKey: ['client', 'appointments'],
    queryFn: clientAPI.getMyAppointments
  });

  const [selectedApptId, setSelectedApptId] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: clientAPI.submitReview,
    onSuccess: () => {
      setIsSuccess(true);
      toast.success('شاطراً لك! تم إرسال تقييمك بنجاح');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء إرسال التقييم'));
    }
  });

  // Filter completed or ready services
  const completedAppointments = appointmentsRaw.filter(app => 
    ['completed', 'ready_for_pickup', 'ready'].includes(app.status)
  );

  const unreviewedAppointments = completedAppointments.filter(app => !app.hasReview);

  const currentAppointmentId = selectedApptId || (unreviewedAppointments.length > 0 ? String(unreviewedAppointments[0].id) : '');
  const appointment = completedAppointments.find(app => String(app.id) === String(currentAppointmentId));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0 || !appointment) return;
    
    reviewMutation.mutate({
      appointment_id: Number(appointment.id),
      rating,
      comment
    });
  };

  if (isLoading) return <PageLoader />;

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <span className="material-symbols-outlined text-5xl text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-4">شكراً لتقييمك!</h2>
        <p className="text-slate-500 max-w-md leading-relaxed">
          نقدر وقتك وملاحظاتك. رأيك يساعدنا على تحسين خدماتنا لتقديم تجربة أفضل دائماً.
        </p>
      </div>
    );
  }

  if (completedAppointments.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 text-center">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner mx-auto mt-12">
          <span className="material-symbols-outlined text-5xl text-slate-300">event_busy</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">لا يوجد مواعيد مكتملة</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          لا يوجد لديك حالياً أي مواعيد صيانة مكتملة لتقييمها. بمجرد اكتمال موعدك القادم، ستتمكن من مشاركة رأيك هنا.
        </p>
      </div>
    );
  }

  if (unreviewedAppointments.length === 0 && !appointment) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 text-center">
        <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-6 shadow-inner mx-auto mt-12">
          <span className="material-symbols-outlined text-5xl text-teal-600">task_alt</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">تم تقييم جميع الخدمات</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          لقد قمت بتقييم جميع خدماتك المكتملة بنجاح. نشكرك على تفاعلك المستمر!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">تقييم الخدمة</h1>
        <p className="text-slate-500 mt-2 text-sm">شاركنا رأيك حول مستوى الخدمة المقدمة لمركبتك.</p>
      </div>

      <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        {reviewMutation.isError && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold mb-6">
            {reviewMutation.error?.response?.data?.message || 'حدث خطأ أثناء إرسال التقييم. يرجى المحاولة مرة أخرى.'}
          </div>
        )}

        {/* Appointment Selection if multiple */}
        {unreviewedAppointments.length > 1 && (
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 block mb-2">اختر الخدمة المكتملة المراد تقييمها:</label>
            <select
              value={currentAppointmentId}
              onChange={(e) => setSelectedApptId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
            >
              {unreviewedAppointments.map(app => (
                <option key={app.id} value={app.id}>
                  #{app.id} - {app.vehicleMake} {app.vehicleModel} ({app.date})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Service Details */}
        {appointment && (
          <div className="bg-slate-50 rounded-2xl p-5 mb-8 flex items-center justify-between border border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800">{appointment.vehicleMake} {appointment.vehicleModel}</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-1">{appointment.description || 'صيانة دورية'}</p>
            </div>
            <div className="text-left text-xs font-mono text-slate-400">
              <div>#APP-{appointment.id}</div>
              <div>{appointment.date}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* Star Rating */}
          <div className="text-center space-y-6">
            <h3 className="text-xl font-bold text-slate-700">كيف تقيم تجربتك معنا؟</h3>
            <div className="flex justify-center gap-3 flex-row-reverse" onMouseLeave={() => setHoverRating(0)}>
              {[5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  className="group outline-none focus:scale-110 transition-transform"
                >
                  <span 
                    className={`material-symbols-outlined text-5xl md:text-6xl transition-all duration-300 drop-shadow-sm ${
                      star <= (hoverRating || rating) 
                        ? 'text-amber-400 scale-110' 
                        : 'text-slate-200 hover:text-amber-200'
                    }`}
                    style={{ fontVariationSettings: star <= (hoverRating || rating) ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 font-medium">اضغط على النجوم للتقييم</p>
          </div>

          {/* Feedback */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 block">ملاحظات إضافية (اختياري)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ما الذي أعجبك؟ وكيف يمكننا تحسين خدمتنا؟"
              className="w-full h-36 px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all resize-none text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={rating === 0 || reviewMutation.isPending}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 flex justify-center items-center gap-2 ${
              rating > 0 
                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {reviewMutation.isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                جاري الإرسال...
              </>
            ) : (
              'إرسال التقييم'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
