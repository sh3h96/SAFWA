/**
 * AlertBanner — Reusable alert banner for warnings, alerts, and system notices.
 * 
 * Props:
 * - variant: 'danger' | 'warning' | 'info' | 'success' (default: 'danger')
 * - icon: string (e.g. 'warning')
 * - message: string
 * - actionLabel: string (optional)
 * - actionIcon: string (optional)
 * - onAction: function (optional)
 * - animate: boolean (default: true)
 */

const variantStyles = {
  danger: {
    container: 'bg-danger-bg border-error/20',
    icon: 'text-danger-text',
    text: 'text-danger-text',
    button: 'bg-danger-text text-white hover:brightness-110'
  },
  warning: {
    container: 'bg-warning-bg border-warning-text/20',
    icon: 'text-warning-text',
    text: 'text-warning-text',
    button: 'bg-warning-text text-white hover:brightness-110'
  },
  info: {
    container: 'bg-info-bg border-info-text/20',
    icon: 'text-info-text',
    text: 'text-info-text',
    button: 'bg-info-text text-white hover:brightness-110'
  },
  success: {
    container: 'bg-success-bg border-success-text/20',
    icon: 'text-success-text',
    text: 'text-success-text',
    button: 'bg-success-text text-white hover:brightness-110'
  }
};

export default function AlertBanner({
  variant = 'danger',
  icon = 'warning',
  message,
  actionLabel,
  actionIcon,
  onAction,
  animate = true
}) {
  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <div className={`border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 ${styles.container} ${animate ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-3">
        {icon && <span className={`material-symbols-outlined text-3xl ${styles.icon}`}>{icon}</span>}
        <p className={`font-bold text-lg ${styles.text}`}>{message}</p>
      </div>

      {actionLabel && (
        <button 
          onClick={onAction}
          className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${styles.button}`}
        >
          {actionIcon && <span className="material-symbols-outlined text-lg">{actionIcon}</span>}
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
