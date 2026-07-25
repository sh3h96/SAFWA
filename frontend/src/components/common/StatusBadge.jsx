/**
 * StatusBadge — Reusable status indicator badge.
 *
 * Props:
 * - variant: 'success' | 'warning' | 'danger' | 'info' | 'primary' (string)
 * - label: Badge text (string)
 */

const variantClasses = {
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  danger: 'bg-danger-bg text-danger-text',
  info: 'bg-info-bg text-info-text',
  primary: 'bg-primary/10 text-primary',
};

export default function StatusBadge({ variant = 'info', label }) {
  const classes = variantClasses[variant] || variantClasses.info;

  return (
    <span
      className={`px-3 py-1 rounded-full text-[11px] font-bold ${classes}`}
    >
      {label}
    </span>
  );
}
