import { useNavigate } from 'react-router-dom';
import safwaLogo from '../../assets/images/safwa-logo.png';

export default function TermsOfUsePage() {
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
            <h2 className="text-2xl font-bold text-on-surface">شروط وأحكام الاستخدام</h2>
            <p className="text-xs text-on-surface-variant mt-1">تاريخ آخر تحديث: 18 أغسطس 2026</p>
          </div>

          <div className="space-y-6 text-sm text-on-surface-variant leading-relaxed">
            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">1. المقدمة والموافقة على الشروط</h3>
              <p>
                مرحباً بك في منصة صفوة (SAFWA). استخدامك للمنصة أو خدمات صيانة وتتبع المركبات يمثل موافقتك الكاملة على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام المنصة.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">2. خدمات المنصة</h3>
              <p>
                تقدم منصة صفوة حلولاً رقمية لإدارة طلبات صيانة السيارات، جدولة المواعيد، الفحص الفني، وإدارة الفواتير وقطع الغيار للعملاء والفنيين والإدارة.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">3. حسابات المستخدمين والمسؤولية</h3>
              <p>
                يلتزم المستخدم بتقديم بيانات صحيحة ومحدثة عند التسجيل (مثل رقم الجوال المحلي المكون من 9 أرقام والبريد الإلكتروني). المستخدم مسؤول مسؤولية كاملة عن الحفاظ على سرية بيانات حسابه وكلمة المرور.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">4. الاستخدام المقبول</h3>
              <p>
                يحظر استخدام المنصة لأي أغراض غير قانونية، أو محاولة الوصول غير المصرح به إلى بيانات مركز الصيانة أو حسابات مستخدمين آخرين.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-on-surface">5. التعديلات على الشروط</h3>
              <p>
                تحتفظ إدارة صفوة بحق تحديث أو تعديل هذه الشروط في أي وقت لتلبية متطلبات التطوير والتشغيل.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-border-slate flex justify-between items-center text-xs text-on-surface-variant">
            <span>© 2026 صفوة (SAFWA) - جميع الحقوق محفوظة</span>
            <button
              onClick={() => navigate('/privacy')}
              className="text-primary font-bold hover:underline"
            >
              الاطلاع على سياسة الخصوصية
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
