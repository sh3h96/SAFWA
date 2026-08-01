/**
 * PageHeader — Reusable header for pages with title, subtitle, and primary action.
 *
 * Props:
 * - title: string
 * - subtitle: string (optional)
 * - actionLabel: string (optional)
 * - actionIcon: string (optional, defaults to 'add_circle')
 * - onAction: function (optional)
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  actionLabel, 
  actionIcon = 'add_circle', 
  onAction 
}) {
  return (
    <div className="mb-8 flex justify-between items-end">
      <div>
        <h2 className="text-2xl font-bold text-inverse-surface mb-1">
          {title}
        </h2>
        {subtitle && (
          <p className="text-secondary text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {actionLabel && (
        <button 
          onClick={onAction}
          className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-teal-hover transition-colors shadow-sm"
        >
          {actionIcon && <span className="material-symbols-outlined text-lg">{actionIcon}</span>}
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
