import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import safwaLogo from '../../assets/images/safwa-logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const [contact, setContact] = useState('example@safwa.sa');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/admin/dashboard');
    }, 800);
  };

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
          <div className="mb-8 w-64 h-64 flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-full border border-white/10 shadow-2xl p-6">
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
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center gap-1.5 border-r border-border-slate my-2 font-mono text-xs text-on-surface-variant font-bold">
                  <span>+966</span>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-on-surface" htmlFor="password">
                  كلمة المرور
                </label>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); navigate('/reset-password'); }}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  نسيت كلمة المرور؟
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined">lock</span>
                </div>
                <input 
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-12 py-3.5 border border-border-slate rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-right text-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
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

          {/* SSO Nafath */}
          <button 
            type="button"
            onClick={() => alert('إعادة التوجيه إلى النفاذ الوطني الموحد')}
            className="w-full bg-surface-container-low border border-border-slate text-on-surface py-3.5 rounded-xl font-bold text-sm hover:bg-surface-container-high transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <div className="w-6 h-6 bg-emerald-700 rounded-md flex items-center justify-center text-xs text-white font-bold">
              N
            </div>
            <span>الدخول عبر النفاذ الوطني الموحد</span>
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
