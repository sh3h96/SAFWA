import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI, getErrorMessage } from '../../services/api';
import safwaLogo from '../../assets/images/safwa-logo.png';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const initialEmail = searchParams.get('email') || '';

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [isResending, setIsResending] = useState(false);
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    async function verify() {
      if (!token) {
        setStatus('error');
        setErrorMessage('رابط التفعيل غير صالح أو لا يحتوي على رمز التفعيل.');
        return;
      }

      try {
        const response = await authAPI.verifyEmail({ token });
        setStatus('success');
        toast.success(response?.message || 'تم تأكيد البريد الإلكتروني بنجاح.');
      } catch (error) {
        setStatus('error');
        const msg = getErrorMessage(error, 'رابط تفعيل البريد الإلكتروني غير صالح أو انتهت صلاحيته.');
        setErrorMessage(msg);
      }
    }

    verify();
  }, [token]);

  const handleResend = async (e) => {
    if (e) e.preventDefault();

    if (!resendEmail) {
      toast.error('يرجى إدخال البريد الإلكتروني لإعادة إرسال رابط التفعيل');
      return;
    }

    setIsResending(true);
    try {
      const res = await authAPI.resendVerification({ email: resendEmail });
      toast.success(res?.message || 'إذا كان البريد الإلكتروني مسجلاً لدينا، فقد تم إرسال رابط التفعيل');
    } catch (error) {
      toast.error(getErrorMessage(error, 'تعذر إرسال رابط التفعيل. يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 flex justify-between items-center px-8 h-16 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
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
            <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300 w-full">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">تم تأكيد البريد الإلكتروني بنجاح!</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  تم تفعيل حسابك بنجاح. يمكنك الآن تسجيل الدخول واستخدام كافة خدمات صفوة.
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
            <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300 w-full">
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

              {/* Resend Verification Form */}
              <div className="space-y-4 pt-4 border-t border-gray-100 w-full text-right">
                <p className="text-xs text-gray-500 font-bold text-center">طلب رابط تفعيل جديد:</p>
                <form onSubmit={handleResend} className="space-y-3">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="w-full h-11 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 outline-none text-sm text-right font-mono"
                  />
                  <button
                    type="submit"
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
                </form>

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
