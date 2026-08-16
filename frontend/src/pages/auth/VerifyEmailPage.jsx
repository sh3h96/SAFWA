import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import safwaLogo from '../../assets/images/safwa-logo.png';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!token || !email) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('رابط التفعيل غير مكتمل أو غير صالح.');
        }
        return;
      }

      try {
        const response = await authAPI.verifyEmail({ token, email });
        if (isMounted) {
          setStatus('success');
          toast.success(response?.message || 'تم تفعيل البريد الإلكتروني بنجاح!');
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          const msg = error.response?.data?.message || 'تعذر تفعيل البريد الإلكتروني. قد يكون الرابط منتهياً أو غير صالح.';
          setErrorMessage(msg);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, email]);

  const handleResend = async () => {
    if (!email) {
      toast.error('البريد الإلكتروني غير متوفر في الرابط');
      return;
    }

    setIsResending(true);
    try {
      const res = await authAPI.resendVerification({ email });
      toast.success(res?.message || 'تم إعادة إرسال رابط التفعيل إلى بريدك الإلكتروني');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر إرسال رابط التفعيل. حاول مرة أخرى.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 flex justify-between items-center px-8 h-16 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={safwaLogo} alt="SAFWA" className="h-8 w-auto object-contain" />
          <span className="font-bold text-xl text-teal-700">SAFWA</span>
        </div>

        <button 
          onClick={() => navigate('/login')}
          className="px-4 py-2 text-teal-700 font-bold text-sm hover:bg-gray-50 rounded-lg transition-colors"
        >
          تسجيل الدخول
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-8 flex flex-col items-center shadow-sm space-y-6 text-center">
          
          {status === 'loading' && (
            <div className="space-y-4 py-8">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-4xl animate-spin">
                  sync
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">جاري التحقق من التفعيل...</h2>
              <p className="text-xs text-gray-500">يرجى الانتظار لحظات حتى يتم التأكد من صحة البريد الإلكتروني.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">تم تفعيل حسابك بنجاح!</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  تم تأكيد ملكية البريد الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول واستخدام كافة خدمات صفوة.
                </p>
              </div>

              <button 
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 hover:bg-teal-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                <span>الانتقال إلى تسجيل الدخول</span>
                <span className="material-symbols-outlined text-lg">login</span>
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  error
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">فشل تفعيل البريد الإلكتروني</h2>
                <p className="text-sm text-red-600 font-medium leading-relaxed">
                  {errorMessage}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100 w-full">
                {email && (
                  <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="w-full h-12 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isResending ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                        <span>جاري إرسال رابط جديد...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">mark_email_unread</span>
                        <span>إعادة إرسال رابط التفعيل</span>
                      </>
                    )}
                  </button>
                )}

                <button 
                  onClick={() => navigate('/login')}
                  className="w-full py-3 bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-100 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <span>العودة لشاشة تسجيل الدخول</span>
                  <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
