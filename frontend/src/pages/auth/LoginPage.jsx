import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI, getErrorMessage } from '../../services/api';
import safwaLogo from '../../assets/images/safwa-logo.png';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showResendBtn, setShowResendBtn] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      return await authAPI.login(credentials);
    },
    onSuccess: (data) => {
      login(data.token, data.user);

      // Redirect based on role
      if (data.user.role === 'client') {
        navigate('/client/vehicles');
      } else if (data.user.role === 'mechanic') {
        navigate('/mechanic/tasks');
      } else {
        // super_admin or admin
        navigate('/admin/appointments');
      }
    },
    onError: (error) => {
      const msg = getErrorMessage(error, 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      setErrorMsg(msg);
      // Check if error is related to email verification
      if (msg.includes('تأكيد') || msg.includes('تفعيل') || msg.includes('البريد')) {
        setShowResendBtn(true);
      } else {
        setShowResendBtn(false);
      }
    }
  });

  const handleResend = async () => {
    if (!contact) return;
    setIsResending(true);
    try {
      const res = await authAPI.resendVerification({ email: contact });
      toast.success(res?.message || 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'تعذر إرسال رابط التفعيل.'));
    } finally {
      setIsResending(false);
    }
  };

  const YEMENI_PHONE_REGEX = /^7\d{8}$/;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setShowResendBtn(false);

    const input = (contact || '').trim();
    if (!input) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني أو رقم الجوال');
      return;
    }
    if (!password) {
      setErrorMsg('كلمة المرور مطلوبة');
      return;
    }

    if (input.includes('@')) {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      if (!isEmail) {
        setErrorMsg('يرجى إدخال بريد إلكتروني صالح');
        return;
      }
    } else {
      if (!YEMENI_PHONE_REGEX.test(input)) {
        setErrorMsg('يرجى إدخال رقم صحيح مكون من تسعة أرقام فقط.');
        return;
      }
    }

    loginMutation.mutate({ email: input, password });
  };

  const isLoading = loginMutation.isPending;

  return (
    <main className="flex min-h-screen w-full bg-surface">
      {/* Left Panel: Brand & Visuals (Desktop) */}
      <section className="hidden lg:flex flex-col w-1/2 bg-[#0D1F2D] relative overflow-hidden p-8 justify-between items-start text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,128,128,0.2)_0%,transparent_50%)] pointer-events-none" />

        {/* Badge Top */}
        <div className="relative z-10 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-full px-6 py-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <span className="text-primary-fixed-dim text-sm font-bold">
            نظام إدارة الورش وصيانة السيارات المتكامل
          </span>
        </div>

        {/* Central Content */}
        <div className="relative z-10 flex flex-col items-center w-full transform -translate-y-4 text-center">
          <div className="mb-8 w-64 h-64 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl overflow-hidden">
            <img
              src={safwaLogo}
              alt="SAFWA Logo"
              className="w-48 h-auto object-contain rounded-2xl"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">SAFWA (صفوة)</h1>
          <p className="text-slate-300 text-base max-w-sm leading-relaxed">
            التحول الرقمي المتكامل لخدمات صيانة المركبات ومتابعة الورش.
          </p>
        </div>

        {/* Product Messaging Footer Highlights */}
        <div className="relative z-10 grid grid-cols-3 gap-4 w-full pt-6 border-t border-white/10 text-center">
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-primary-fixed-dim text-2xl mb-1">directions_car</span>
            <span className="text-slate-300 text-xs font-bold">إدارة المركبات</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-primary-fixed-dim text-2xl mb-1">build_circle</span>
            <span className="text-slate-300 text-xs font-bold">سير العمل الفني</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-primary-fixed-dim text-2xl mb-1">receipt_long</span>
            <span className="text-slate-300 text-xs font-bold">متابعة الفواتير</span>
          </div>
        </div>
      </section>

      {/* Right Panel: Login Form */}
      <section className="w-full lg:w-1/2 bg-white flex flex-col justify-between items-center p-6 md:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md my-auto space-y-8 py-6">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-4">
            <div className="w-20 h-20 bg-[#0D1F2D] p-3 rounded-2xl flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden">
              <img src={safwaLogo} alt="SAFWA Logo" className="h-full w-auto object-contain rounded-xl" />
            </div>
          </div>

          {/* Header */}
          <header className="text-right space-y-2">
            <h2 className="text-3xl font-bold text-on-surface">مرحباً بك مجدداً في صفوة</h2>
            <p className="text-sm text-on-surface-variant">
              أدخل بياناتك للوصول إلى لوحة التحكم أو متابعة مركبتك
            </p>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-bold text-center space-y-2">
                <p>{errorMsg}</p>
                {showResendBtn && (
                  <div>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="mt-1 text-xs bg-white text-teal-700 border border-teal-300 px-3 py-1.5 rounded-md hover:bg-teal-50 font-bold transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {isResending ? (
                        <span>جاري الإرسال...</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">mark_email_unread</span>
                          <span>إعادة إرسال رابط التفعيل</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Phone/Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface" htmlFor="contact">
                البريد الإلكتروني أو رقم الجوال
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <input
                  id="contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="7XXXXXXXX أو example@domain.com"
                  className="block w-full pr-12 pl-24 py-3.5 border border-border-slate rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-right text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center border-r border-border-slate my-2 font-mono text-xs text-on-surface-variant font-bold pr-3">
                  <span dir="ltr">+967</span>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center w-full mb-1">
                <label className="block text-sm font-bold text-on-surface" htmlFor="password">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="text-sm text-teal-600 hover:text-teal-700 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined">lock</span>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pr-12 pl-12 py-3.5 border border-border-slate rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-right text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-3">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 text-primary border-border-slate rounded focus:ring-primary/20 transition-all cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-on-surface-variant cursor-pointer select-none font-medium">
                تذكرني على هذا الجهاز
              </label>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-container text-white py-4 rounded-xl font-bold text-base hover:bg-teal-hover active:scale-[0.98] transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <span className="material-symbols-outlined">login</span>
                </>
              )}
            </button>
          </form>

          {/* Registration Footer */}
          <footer className="pt-2 text-center">
            <p className="text-sm text-on-surface-variant">
              ليس لديك حساب؟{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-primary font-bold hover:underline transition-all bg-transparent border-0 p-0 cursor-pointer"
              >
                إنشاء حساب جديد
              </button>
            </p>
          </footer>

          {/* Bottom Legal Footer */}
          <div className="pt-6 border-t border-gray-100 flex flex-wrap justify-center items-center gap-4 text-on-surface-variant/70 text-xs">
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="hover:text-primary transition-colors bg-transparent border-0 p-0 cursor-pointer"
            >
              سياسة الخصوصية
            </button>
            <span className="text-gray-300">•</span>
            <button
              type="button"
              onClick={() => navigate('/terms')}
              className="hover:text-primary transition-colors bg-transparent border-0 p-0 cursor-pointer"
            >
              شروط الاستخدام
            </button>
            <span className="text-gray-300">•</span>
            <span>© 2026 صفوة (SAFWA)</span>
          </div>
        </div>
      </section>
    </main>
  );
}
