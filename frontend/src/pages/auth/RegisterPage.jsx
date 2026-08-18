import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import safwaLogo from '../../assets/images/safwa-logo.png';
import { authAPI, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Comprehensive Password Strength Meter
  const getPasswordStrength = () => {
    if (!password) return { label: '', color: 'bg-gray-200', level: 0 };
    if (password.length < 6) {
      return { label: 'ضعيفة (قصيرة جداً)', color: 'bg-red-500', level: 1 };
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const charTypes = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

    if (charTypes <= 1) {
      return { label: 'ضعيفة', color: 'bg-red-500', level: 1 };
    }
    if (password.length >= 8 && charTypes >= 3) {
      return { label: 'قوية', color: 'bg-green-500', level: 3 };
    }
    return { label: 'متوسطة', color: 'bg-yellow-500', level: 2 };
  };

  const strength = getPasswordStrength();

  const YEMENI_PHONE_REGEX = /^7\d{8}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = (email || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanName = (fullName || '').trim();

    if (!cleanName || cleanName.length < 2) {
      toast.error('الاسم الكامل مطلوب ويجب أن لا يقل عن حرفين');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('يرجى إدخال بريد إلكتروني صالح');
      return;
    }

    if (!cleanPhone || !YEMENI_PHONE_REGEX.test(cleanPhone)) {
      toast.error('يرجى إدخال رقم صحيح مكون من تسعة أرقام فقط.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('كلمة المرور وتأكيد كلمة المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        fullName: cleanName,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        password,
      };

      const response = await authAPI.register(payload);

      toast.success(response?.message || 'تم إنشاء الحساب بنجاح! يرجى تفعيل البريد الإلكتروني.');
      setIsSubmitted(true);
    } catch (error) {
      toast.error(getErrorMessage(error, 'حدث خطأ أثناء التسجيل. حاول مرة أخرى.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      const res = await authAPI.resendVerification({ email });
      toast.success(res?.message || 'تم إعادة إرسال رابط التفعيل بنجاح');
    } catch (error) {
      toast.error(getErrorMessage(error, 'تعذر إرسال رابط التفعيل. حاول لاحقاً.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full bg-surface">
      {/* Left Panel: Brand & Visuals (Desktop) */}
      <section className="hidden lg:flex flex-col w-1/2 bg-[#0D1F2D] relative overflow-hidden p-8 justify-between items-start text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,128,128,0.2)_0%,transparent_50%)] pointer-events-none" />

        {/* Badge Top */}
        <div className="relative z-10 bg-teal-900/40 backdrop-blur-md border border-teal-500/30 rounded-full px-6 py-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-teal-400" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <span className="text-teal-400 text-sm font-bold">
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
            <span className="material-symbols-outlined text-teal-400 text-2xl mb-1">directions_car</span>
            <span className="text-slate-300 text-xs font-bold">إدارة المركبات</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-teal-400 text-2xl mb-1">build_circle</span>
            <span className="text-slate-300 text-xs font-bold">سير العمل الفني</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="material-symbols-outlined text-teal-400 text-2xl mb-1">receipt_long</span>
            <span className="text-slate-300 text-xs font-bold">متابعة الفواتير</span>
          </div>
        </div>
      </section>

      {/* Right Panel: Form / Success State */}
      <section className="w-full lg:w-1/2 bg-white flex flex-col justify-between items-center p-6 md:p-12 pb-16 min-h-screen relative overflow-y-auto">
        <div className="w-full max-w-md my-auto space-y-8 py-6 pb-12">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-4">
            <div className="w-20 h-20 bg-[#0D1F2D] p-3 rounded-2xl flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden">
              <img src={safwaLogo} alt="SAFWA Logo" className="h-full w-auto object-contain rounded-xl" />
            </div>
          </div>

          {isSubmitted ? (
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  mark_email_read
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">تم إنشاء حسابك بنجاح!</h2>
                <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                  تم إرسال رابط تفعيل الحساب إلى البريد الإلكتروني:
                  <span className="block font-mono font-bold text-teal-700 mt-1" dir="ltr">{email}</span>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  يرجى فتح بريدك الإلكتروني والنقر على رابط التفعيل لتتمكن من تسجيل الدخول.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full h-12 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <span>الانتقال إلى تسجيل الدخول</span>
                  <span className="material-symbols-outlined text-lg">login</span>
                </button>

                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="w-full py-3 bg-gray-50 text-teal-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-100 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
                >
                  {isResending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      <span>جاري إعادة الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">forward_to_inbox</span>
                      <span>لم يصلك البريد؟ إعادة إرسال رابط التفعيل</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-gray-900">إنشاء حساب جديد</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخل اسمك الثلاثي"
                    className="block w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-sm outline-none"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">رقم الجوال</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="7XXXXXXXX"
                      className="block w-full pr-4 pl-20 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-sm outline-none text-right font-mono"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center border-r border-gray-200 my-2 pr-3">
                      <span className="font-mono text-xs text-gray-500 font-bold" dir="ltr">+967</span>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="block w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-sm outline-none font-mono text-right"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Password */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">كلمة المرور</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pr-4 pl-10 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-sm outline-none font-mono text-right"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>

                    {/* Dynamic Strength Meter */}
                    {password.length > 0 && (
                      <div className="pt-2">
                        <div className="flex gap-1 mb-1">
                          <div className={`h-1.5 flex-1 rounded ${strength.level >= 1 ? strength.color : 'bg-gray-200'}`} />
                          <div className={`h-1.5 flex-1 rounded ${strength.level >= 2 ? strength.color : 'bg-gray-200'}`} />
                          <div className={`h-1.5 flex-1 rounded ${strength.level >= 3 ? strength.color : 'bg-gray-200'}`} />
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold">
                          قوة كلمة المرور: {strength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pr-4 pl-10 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-sm outline-none font-mono text-right"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-3 mt-8">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-600/20 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed">
                    بإنشاء حساب، فإنك توافق على{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/terms')}
                      className="text-teal-600 font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                    >
                      الشروط والأحكام
                    </button>{' '}
                    و{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/privacy')}
                      className="text-teal-600 font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                    >
                      سياسة الخصوصية
                    </button>{' '}
                    الخاصة بمنصة صفوة.
                  </label>
                </div>

                {/* CTA Button */}
                <button
                  type="submit"
                  disabled={!agreeTerms || isLoading}
                  className="w-full h-12 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                      <span>جاري التسجيل...</span>
                    </>
                  ) : (
                    <>
                      <span>إنشاء الحساب</span>
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Footer Link */}
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-600">
                  لديك حساب بالفعل؟{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-teal-600 font-bold hover:underline transition-all bg-transparent border-0 p-0 cursor-pointer"
                  >
                    تسجيل الدخول
                  </button>
                </p>
              </div>

              {/* Bottom Legal Footer */}
              <div className="pt-6 flex flex-wrap justify-center items-center gap-4 text-gray-500 text-xs">
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="hover:text-teal-600 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                >
                  سياسة الخصوصية
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="hover:text-teal-600 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                >
                  شروط الاستخدام
                </button>
                <span className="text-gray-300">•</span>
                <span>© 2026 صفوة (SAFWA)</span>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
