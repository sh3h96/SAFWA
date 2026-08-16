import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import safwaLogo from '../../assets/images/safwa-logo.png';
import toast from 'react-hot-toast';

export default function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token');
  const emailParam = searchParams.get('email');

  // Mode: if token & email exist in query string, we are in Reset Mode. Otherwise Request Mode.
  const isResetMode = Boolean(tokenParam && emailParam);

  // Form states
  const [email, setEmail] = useState(emailParam || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  // Request Link Submission (Forgot Password)
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.forgotPassword({ email });
      toast.success(response?.message || 'إذا كان البريد الإلكتروني مسجلاً، فقد تم إرسال رابط إعادة الضبط.');
      setIsRequestSent(true);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'حدث خطأ أثناء طلب إعادة الضبط. حاول لاحقاً.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Password Submission
  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.resetPassword({
        email: emailParam,
        token: tokenParam,
        newPassword,
      });

      toast.success(response?.message || 'تم إعادة ضبط كلمة المرور بنجاح!');
      setIsResetSuccess(true);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'تعذر إعادة ضبط كلمة المرور. قد يكون الرابط منتهياً أو غير صالح.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
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
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-8 flex flex-col items-center shadow-sm space-y-6">
          
          {/* Top Shield Icon */}
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isResetMode ? 'lock_reset' : 'lock_open'}
            </span>
          </div>

          {/* Header Text */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {isResetMode ? 'تعيين كلمة المرور الجديدة' : 'استرداد كلمة المرور'}
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              {isResetMode 
                ? 'أدخل كلمة المرور الجديدة لحسابك وقم بتأكيدها'
                : 'أدخل البريد الإلكتروني المرتبط بحسابك لاستلام رابط استعادة كلمة المرور'
              }
            </p>
          </div>

          {/* MODE A: Request Form (No token in URL) */}
          {!isResetMode && !isRequestSent && (
            <form onSubmit={handleRequestSubmit} className="w-full space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  البريد الإلكتروني
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 outline-none text-sm font-mono text-right"
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-teal-600/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <span>إرسال رابط الاستعادة</span>
                    <span className="material-symbols-outlined text-lg">send</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE A SUCCESS: Request Sent Message */}
          {!isResetMode && isRequestSent && (
            <div className="w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs leading-relaxed space-y-2">
                <span className="material-symbols-outlined text-2xl text-teal-600 block mx-auto">mark_email_read</span>
                <p className="font-bold text-sm">تم إرسال تعليمات الاستعادة</p>
                <p>
                  إذا كان البريد الإلكتروني <span className="font-mono font-bold" dir="ltr">{email}</span> مسجلاً لدينا، فقد تم إرسال رابط لإعادة ضبط كلمة المرور.
                </p>
              </div>

              <button 
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all text-sm shadow-md"
              >
                الانتقال إلى تسجيل الدخول
              </button>
            </div>
          )}

          {/* MODE B: Reset Password Form (Token & Email in URL) */}
          {isResetMode && !isResetSuccess && (
            <form onSubmit={handleResetSubmit} className="w-full space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">البريد الإلكتروني</label>
                <input 
                  type="email"
                  disabled
                  value={emailParam || ''}
                  className="w-full h-12 px-4 bg-gray-100 border border-gray-300 rounded-xl font-mono text-sm text-gray-600 text-right cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">كلمة المرور الجديدة</label>
                <input 
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 outline-none font-mono text-sm text-right"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">تأكيد كلمة المرور الجديدة</label>
                <input 
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 outline-none font-mono text-sm text-right"
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 active:scale-[0.98] transition-all text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <span>حفظ كلمة المرور الجديدة</span>
                    <span className="material-symbols-outlined text-lg">check</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE B SUCCESS: Reset Complete Message */}
          {isResetMode && isResetSuccess && (
            <div className="w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs leading-relaxed space-y-2">
                <span className="material-symbols-outlined text-3xl text-green-600 block mx-auto">task_alt</span>
                <p className="font-bold text-sm">تم تغيير كلمة المرور بنجاح!</p>
                <p>يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.</p>
              </div>

              <button 
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all text-sm shadow-md"
              >
                الانتقال إلى تسجيل الدخول
              </button>
            </div>
          )}

          {/* Back Navigation Link */}
          <button 
            onClick={() => navigate('/login')}
            className="pt-2 flex items-center gap-2 text-teal-700 hover:underline transition-all text-sm font-bold"
          >
            <span>العودة لشاشة تسجيل الدخول</span>
            <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
          </button>

        </div>
      </main>
    </div>
  );
}
