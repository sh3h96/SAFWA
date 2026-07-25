import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import safwaLogo from '../../assets/images/safwa-logo.png';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('customer'); // 'customer' or 'workshop'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAccordion, setShowAccordion] = useState(false);
  const [plateNumbers, setPlateNumbers] = useState('');
  const [plateLetters, setPlateLetters] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Dynamic Password Strength Meter
  const getPasswordStrength = () => {
    if (password.length === 0) return { label: '', color: 'bg-border-slate', level: 0 };
    if (password.length < 5) return { label: 'ضعيفة', color: 'bg-danger-text', level: 1 };
    if (password.length < 8) return { label: 'متوسطة', color: 'bg-warning-text', level: 2 };
    return { label: 'قوية', color: 'bg-success-text', level: 3 };
  };

  const strength = getPasswordStrength();

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('تم إنشاء الحساب بنجاح! جارٍ توجيهك لصفحة تسجيل الدخول.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Top Header */}
      <header className="bg-white border-b border-border-slate flex justify-between items-center px-8 h-16 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={safwaLogo} alt="SAFWA" className="h-8 w-auto object-contain" />
          <span className="font-bold text-xl text-primary">صفوة</span>
        </div>

        <button 
          onClick={() => navigate('/login')}
          className="px-4 py-2 text-primary font-bold text-sm hover:bg-surface-container-low rounded-lg transition-colors"
        >
          تسجيل الدخول
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-2xl bg-white border border-border-slate rounded-xl p-8 shadow-sm">
          {/* Branding & Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <img src={safwaLogo} alt="SAFWA Logo" className="h-16 mb-4 object-contain" />
            <h2 className="font-bold text-2xl text-on-surface mb-2">إنشاء حساب جديد</h2>
            <div className="flex items-center gap-3 text-xs text-secondary font-bold">
              <span className="text-primary font-bold border-b-2 border-primary pb-1">البيانات الشخصية</span>
              <span className="text-slate-300">●</span>
              <span className="opacity-50">تأكيد الحساب</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Type Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-secondary">نوع الحساب</label>
              <div className="grid grid-cols-2 gap-4 p-1.5 bg-surface-container rounded-xl">
                <button
                  type="button"
                  onClick={() => setAccountType('customer')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                    accountType === 'customer' 
                      ? 'bg-white shadow-sm text-primary' 
                      : 'text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    car_repair
                  </span>
                  <span>عميل / صاحب مركبة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('workshop')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                    accountType === 'workshop' 
                      ? 'bg-white shadow-sm text-primary' 
                      : 'text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">build</span>
                  <span>مركز صيانة / ورشة</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-secondary">الاسم الكامل</label>
                <input 
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الثلاثي"
                  className="w-full p-3 border border-border-slate rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-secondary">رقم الجوال</label>
                <div className="flex">
                  <span className="p-3 border border-border-slate border-l-0 rounded-r-lg bg-surface-container-low text-xs font-mono font-bold text-secondary">
                    +966 🇸🇦
                  </span>
                  <input 
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="5XXXXXXXX"
                    className="w-full p-3 border border-border-slate rounded-l-lg text-sm bg-white font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-bold text-secondary">البريد الإلكتروني</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full p-3 border border-border-slate rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-secondary">كلمة المرور</label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full p-3 border border-border-slate rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                
                {/* Dynamic Strength Meter */}
                {password.length > 0 && (
                  <div className="pt-2">
                    <div className="flex gap-1 mb-1">
                      <div className={`h-1.5 flex-1 rounded ${strength.level >= 1 ? strength.color : 'bg-border-slate'}`} />
                      <div className={`h-1.5 flex-1 rounded ${strength.level >= 2 ? strength.color : 'bg-border-slate'}`} />
                      <div className={`h-1.5 flex-1 rounded ${strength.level >= 3 ? strength.color : 'bg-border-slate'}`} />
                    </div>
                    <span className="text-[10px] text-secondary font-bold">
                      قوة كلمة المرور: {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-secondary">تأكيد كلمة المرور</label>
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  className="w-full p-3 border border-border-slate rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Accordion: Optional Vehicle Details */}
            <div className="border border-border-slate rounded-xl overflow-hidden bg-surface-container-low">
              <button 
                type="button"
                onClick={() => setShowAccordion(!showAccordion)}
                className="w-full p-4 flex justify-between items-center bg-white hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">directions_car</span>
                  <span className="text-sm font-bold text-secondary">إضافة مركبتك الأولى الآن (اختياري)</span>
                </div>
                <span className={`material-symbols-outlined transition-transform duration-300 ${
                  showAccordion ? 'rotate-180' : ''
                }`}>
                  expand_more
                </span>
              </button>

              {showAccordion && (
                <div className="p-6 border-t border-border-slate space-y-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-secondary">أرقام وأحرف اللوحة</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text"
                          maxLength={4}
                          value={plateNumbers}
                          onChange={(e) => setPlateNumbers(e.target.value)}
                          placeholder="1234"
                          className="p-2.5 border border-border-slate rounded-lg text-center font-mono text-sm"
                        />
                        <input 
                          type="text"
                          maxLength={4}
                          value={plateLetters}
                          onChange={(e) => setPlateLetters(e.target.value)}
                          placeholder="أ ب ج"
                          className="p-2.5 border border-border-slate rounded-lg text-center font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-secondary">موديل المركبة</label>
                      <input 
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="Toyota Camry 2023"
                        className="w-full p-3 border border-border-slate rounded-lg text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start gap-3">
              <input 
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-border-slate rounded focus:ring-primary/20 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-secondary leading-relaxed">
                بإنشاء حساب، فإنك توافق على <a href="#" className="text-primary font-bold underline">الشروط والأحكام</a> و <a href="#" className="text-primary font-bold underline">سياسة الخصوصية</a> الخاصة بمنصة صفوة.
              </label>
            </div>

            {/* CTA Button */}
            <button 
              type="submit"
              disabled={!agreeTerms}
              className="w-full h-12 bg-primary-container text-white font-bold rounded-xl shadow-sm hover:bg-teal-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>إنشاء الحساب</span>
              <span className="material-symbols-outlined">person_add</span>
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 pt-6 border-t border-border-slate text-center">
            <p className="text-sm text-secondary">
              لديك حساب بالفعل؟{' '}
              <button 
                onClick={() => navigate('/login')}
                className="text-primary font-bold hover:underline transition-all"
              >
                تسجيل الدخول
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
