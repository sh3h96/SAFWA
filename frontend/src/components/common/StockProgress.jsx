/**
 * StockProgress — Reusable component for displaying stock levels and progress bars.
 * Reusable across Dashboard, Inventory, Warehouse, and other pages.
 * 
 * Props:
 * - current: number
 * - max: number
 * - status: 'low' | 'medium' | 'good' | string (optional)
 * - statusLabel: string (optional, defaults based on status)
 */
export default function StockProgress({ 
  current, 
  max, 
  status, 
  statusLabel 
}) {
  const percentage = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;

  // Determine status automatically if not passed
  let resolvedStatus = status;
  if (!resolvedStatus) {
    if (percentage <= 20) resolvedStatus = 'low';
    else if (percentage <= 40) resolvedStatus = 'medium';
    else resolvedStatus = 'good';
  }

  const statusConfig = {
    low: {
      label: 'منخفض',
      textColor: 'text-danger-text',
      barColor: 'bg-danger-text'
    },
    medium: {
      label: 'متوسط',
      textColor: 'text-warning-text',
      barColor: 'bg-warning-text'
    },
    good: {
      label: 'جيد',
      textColor: 'text-success-text',
      barColor: 'bg-success-text'
    }
  };

  const config = statusConfig[resolvedStatus] || statusConfig.good;
  const labelText = statusLabel || config.label;

  return (
    <div className="w-32">
      <div className="flex justify-between text-xs mb-1">
        <span>{current} / {max}</span>
        <span className={config.textColor}>{labelText}</span>
      </div>
      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${config.barColor}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
