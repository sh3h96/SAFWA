import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import safwaLogo from '../../assets/images/safwa-logo.png';

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: New Password
  const [identifier, setIdentifier] = useState('+966 50 000 0000');
  const [otp, setOtp] = useState(['5', '2', '9', '1']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleFinishReset = (e) => {
    e.preventDefault();
    alert('تم إعادة ضبط كلمة المرور بنجاح! جارٍ التوجيه لتسجيل الدخول.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Top Bar */}
      <header className="bg-white border-b border-border-slate flex justify-between items-center px-8 h-16 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={safwaLogo} alt="SAFWA" className="h-8 w-auto object-contain" />
          <span className="font-bold text-xl text-primary">SAFWA</span>
        </div>

        <button 
          onClick={() => navigate('/login')}
          className="px-4 py-2 text-primary font-bold text-sm hover:bg-surface-container-low rounded-lg transition-colors"
        >
          تسجيل الدخول
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white border border-border-slate rounded-xl w-full max-w-md p-8 flex flex-col items-center shadow-sm space-y-6">
          {/* Top Shield Icon */}
          <div className="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary-container text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield_with_heart
            </span>
          </div>

          {/* Header Text */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-primary">استرداد كلمة المرور</h1>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              أدخل رقم الجوال أو البريد المرتبط بحسابك لاستلام رمز التحقق (OTP)
            </p>
          </div>

          {/* Multi-Step Flow */}
          <div className="w-full space-y-6">
            {/* Step 1: Identifier Input */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-primary">
                    رقم الجوال أو البريد الإلكتروني
                  </label>
                  <input 
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="مثال: +966 50 000 0000"
                    className="w-full h-12 px-4 border border-border-slate rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-mono"
                  />
                </div>
                <button 
                  onClick={() => setStep(2)}
                  className="w-full h-12 bg-primary-container text-white font-bold rounded-lg hover:bg-teal-hover active:scale-95 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <span>إرسال رمز التحقق</span>
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-success-bg border border-success-text/20 p-4 rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-success-text text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <p className="text-xs text-success-text leading-relaxed">
                    تم إرسال رمز مكون من 4 أرقام إلى{' '}
                    <span className="font-mono font-bold" dir="ltr">{identifier}</span>
                  </p>
                </div>

                {/* 4 OTP Digit Boxes */}
                <div className="flex justify-center gap-3" dir="ltr">
                  {otp.map((digit, idx) => (
                    <input 
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      className="w-12 h-14 text-center text-xl font-bold font-mono border border-border-slate rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-low"
                    />
                  ))}
                </div>

                <div className="text-center">
                  <p className="text-xs text-on-surface-variant">
                    إعادة إرسال الرمز خلال{' '}
                    <span className="text-primary font-bold">(0:45)</span>
                  </p>
                </div>

                <button 
                  onClick={() => setStep(3)}
                  className="w-full h-12 bg-primary-container text-white font-bold rounded-lg hover:bg-teal-hover active:scale-95 transition-all text-sm shadow-sm"
                >
                  تحقق
                </button>
              </div>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleFinishReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-primary">كلمة المرور الجديدة</label>
                  <input 
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-4 border border-border-slate rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-primary">تأكيد كلمة المرور الجديدة</label>
                  <input 
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-4 border border-border-slate rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono text-sm"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full h-12 bg-primary-container text-white font-bold rounded-lg hover:bg-teal-hover active:scale-95 transition-all text-sm shadow-sm"
                >
                  حفظ كلمة المرور وتسجيل الدخول
                </button>
              </form>
            )}
          </div>

          {/* Back Navigation Link */}
          <button 
            onClick={() => navigate('/login')}
            className="pt-2 flex items-center gap-2 text-primary hover:underline transition-all text-sm font-bold"
          >
            <span>العودة لشاشة تسجيل الدخول</span>
            <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
          </button>
        </div>
      </main>
    </div>
  );
}
