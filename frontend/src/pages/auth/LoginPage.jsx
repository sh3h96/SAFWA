import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from '../../services/api';
import safwaLogo from '../../assets/images/safwa-logo.png';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [contact, setContact] = useState('admin@safwa.sa'); // using the known admin email
  const [password, setPassword] = useState('password123'); // real default password from seeder
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
        // admin or receptionist
        navigate('/admin/appointments');
      }
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.';
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
      toast.error(err.response?.data?.message || 'تعذر إرسال رابط التفعيل.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setShowResendBtn(false);
    loginMutation.mutate({ email: contact, password });
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
            نظام إدارة الورش وصيانة السيارات الأول
          </span>
        </div>

        {/* Central Content */}
        <div className="relative z-10 flex flex-col items-center w-full transform -translate-y-8 text-center">
          <div className="mb-8 w-64 h-64 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl">
            <img 
              src={safwaLogo} 
              alt="SAFWA Logo" 
              className="w-48 h-auto object-contain" 
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">SAFWA (صفوة)</h1>
          <p className="text-slate-300 text-base max-w-sm leading-relaxed">
            التحول الرقمي المتكامل لخدمات صيانة المركبات في الجمهورية اليمنية.
          </p>
        </div>

        {/* Footer Stats */}
        <div className="relative z-10 flex items-center justify-around w-full pt-6 border-t border-white/10">
          <div className="flex flex-col items-center">
            <span className="text-primary-fixed-dim text-3xl font-bold data-mono">+500</span>
            <span className="text-slate-400 text-xs uppercase tracking-wider mt-0.5">ورشة مفعلة</span>
          </div>
          <div className="h-10 w-[1px] bg-white/20" />
          <div className="flex flex-col items-center">
            <span className="text-primary-fixed-dim text-3xl font-bold data-mono">24/7</span>
            <span className="text-slate-400 text-xs uppercase tracking-wider mt-0.5">دعم فني</span>
          </div>
        </div>
      </section>

      {/* Right Panel: Login Form */}
      <section className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center p-6 md:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-4">
            <img src={safwaLogo} alt="SAFWA Logo" className="h-16 w-auto object-contain" />
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
                  placeholder="example@safwa.sa"
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
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); navigate('/reset-password'); }}
                  className="text-sm text-teal-600 hover:text-teal-700 hover:underline"
                >
                  نسيت كلمة المرور؟
                </a>
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
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 hover:text-on-surface transition-colors"
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
              className="w-full bg-primary-container text-white py-4 rounded-xl font-bold text-base hover:bg-teal-hover active:scale-[0.98] transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
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

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border-slate" />
            <span className="flex-shrink mx-4 text-on-surface-variant text-xs font-bold">أو من خلال</span>
            <div className="flex-grow border-t border-border-slate" />
          </div>

          {/* Google Login */}
          <button 
            type="button"
            onClick={() => alert('تسجيل الدخول عبر Google غير مفعل حالياً')}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>الدخول عبر Google</span>
          </button>

          {/* Registration Footer */}
          <footer className="pt-4 text-center">
            <p className="text-sm text-on-surface-variant">
              ليس لديك حساب؟{' '}
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); navigate('/register'); }}
                className="text-primary font-bold hover:underline transition-all"
              >
                إنشاء حساب جديد
              </a>
            </p>
          </footer>

          {/* Bottom Legal */}
          <div className="pt-8 flex justify-center gap-6 text-on-surface-variant/60 text-xs">
            <a href="#" className="hover:text-primary transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-primary transition-colors">شروط الاستخدام</a>
            <span>© 2024 صفوة (SAFWA)</span>
          </div>
        </div>
      </section>
    </main>
  );
}
