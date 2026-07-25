/**
 * MetricCard — Reusable dashboard statistics card.
 *
 * Props:
 * - icon: Material Symbol icon name (string)
 * - iconBgClass: Tailwind bg class for icon container (string)
 * - iconColorClass: Tailwind text color class for icon (string)
 * - label: Description text (string)
 * - value: Main displayed value (string)
 * - suffix: Optional unit suffix like "ر.س" (string)
 * - trend: Optional { direction: 'up'|'down', value: string }
 * - caption: Optional secondary text beside icon area (string)
 * - progress: Optional { value: number, colorClass: string }
 * - valueClass: Optional extra classes for value text (string)
 * - borderVariant: Optional border override classes (string)
 * - pulse: Optional boolean to enable pulse animation
 */
export default function MetricCard({
  icon,
  iconBgClass,
  iconColorClass,
  label,
  value,
  suffix,
  trend,
  caption,
  progress,
  valueClass = '',
  borderVariant,
  pulse = false,
}) {
  const borderClasses = borderVariant
    ? borderVariant
    : 'border border-outline-variant';

  return (
    <div
      className={`bg-white p-5 rounded-xl shadow-sm relative overflow-hidden ${borderClasses} ${
        pulse ? 'animate-pulse-border' : ''
      }`}
    >
      {/* Top row: icon + trend/caption */}
      <div className="flex justify-between items-start mb-4">
        <div
          className={`w-12 h-12 ${iconBgClass} rounded-lg flex items-center justify-center ${iconColorClass}`}
        >
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>

        {/* Trend indicator */}
        {trend && (
          <span className="flex items-center text-success-text text-xs font-bold gap-1">
            <span className="material-symbols-outlined text-sm">
              {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
            </span>
            {trend.value}
          </span>
        )}

        {/* Caption (e.g. "السعة: 80%") */}
        {caption && !trend && (
          <span className="text-secondary text-xs font-bold">{caption}</span>
        )}
      </div>

      {/* Label */}
      <p className="text-secondary text-sm mb-1">{label}</p>

      {/* Value */}
      <h3
        className={`text-2xl font-bold text-inverse-surface ${valueClass}`}
        style={{ fontFamily: suffix ? "'JetBrains Mono', monospace" : undefined }}
      >
        {value}
        {suffix && (
          <span className="text-sm font-[Tajawal]"> {suffix}</span>
        )}
      </h3>

      {/* Progress bar */}
      {progress && (
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3">
          <div
            className={`${progress.colorClass} h-full rounded-full`}
            style={{ width: `${progress.value}%` }}
          />
        </div>
      )}
    </div>
  );
}
