import safwaLogo from '../../assets/images/safwa-logo.png';

/**
 * PageLoader — Sleek loading screen fallback for Suspense & Lazy Loading route transitions.
 */
export default function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-8 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={safwaLogo}
            alt="SAFWA"
            className="w-10 h-auto object-contain opacity-90"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      </div>
      <p className="text-sm font-bold text-inverse-surface tracking-wide">
        جاري تحميل الصفحة...
      </p>
      <p className="text-xs text-secondary mt-1">صفوة لصيانة وتجديد السيارات</p>
    </div>
  );
}
