import { useNavigate } from 'react-router-dom';
import safwaLogo from '../../assets/images/safwa-logo.png';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Top Header */}
      <header className="bg-[#0D1F2D] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/login')}>
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl p-1.5 flex items-center justify-center border border-white/20">
            <img src={safwaLogo} alt="SAFWA Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">منصة صفوة (SAFWA)</h1>
            <p className="text-xs text-slate-300">نظام إدارة صيانة المركبات</p>
          </div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary/20 text-primary-fixed-dim hover:bg-primary/30 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm rotate-180">arrow_forward</span>
          <span>العودة</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-6 md:p-12 space-y-8">
        <div className="bg-white border border-border-slate rounded-2xl p-6 md:p-10 shadow-sm space-y-6">
          <div className="border-b border-border-slate pb-4">
            <h2 className="text-2xl font-bold text-on-surface">سياسة الخصوصية وحماية البيانات</h2>
            <p className="text-xs text-on-surface-variant mt-1">تاريخ آخر تحديث: 18 أغسطس 2026</p>
          </div>

          <div className="space-y-6 text-sm text-on-surface-variant leading-relaxed">
            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">1. جمع البيانات والمعلومات</h3>
              <p>
                تقوم منصة صفوة بجمع البيانات الضرورية لتقديم خدمات صيانة السيارات بفاعلية، وتشمل: الاسم، البريد الإلكتروني، رقم الجوال، وبيانات المركبات المسجلة وسجلات الصيانة.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">2. استخدام البيانات</h3>
              <p>
                تُستخدم البيانات المسجلة لإدارة المواعيد، تقديم التقارير الفنية، تصدير الفواتير، وإبلاغك بتحديثات حالة صيانة مركبتك. لن يتم بيع أو مشاركة بياناتك الشخصية مع أي أطراف خارجية غير مصرح لها.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">3. حماية وأمان البيانات</h3>
              <p>
                نطبق معايير أمان وتشفير متقدمة لحماية بيانات الحسابات وكلمات المرور وسجلات العمليات، بما يضمن السرية التامة ومنع الوصول غير المصرح به.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">4. حقوق المستخدم</h3>
              <p>
                يحق للمستخدم الاطلاع على بيانات مركباته وسجل الصيانة الخاص به وتحديث بيانات التواصل عند الحاجة عبر لوحة التحكم.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">5. التواصل والدعم</h3>
              <p>
                في حال وجود أي استفسار بشأن سياسة الخصوصية أو إدارة بياناتك، يمكنك التواصل مع فريق إدارة المنصة عبر القنوات المعتمدة.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-border-slate flex justify-between items-center text-xs text-on-surface-variant">
            <span>© 2026 صفوة (SAFWA) - جميع الحقوق محفوظة</span>
            <button
              onClick={() => navigate('/terms')}
              className="text-primary font-bold hover:underline"
            >
              الاطلاع على شروط الاستخدام
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
