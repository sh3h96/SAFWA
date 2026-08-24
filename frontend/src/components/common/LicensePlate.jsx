/**
 * LicensePlate — Reusable Saudi automotive license plate badge.
 * 
 * Props:
 * - plateNumber: string (e.g., 'ح ص ل ٥٥١' or 'L R N 1010')
 * - country: string (default: 'KSA')
 * - variant: 'default' | 'compact' (default: 'default')
 * - className: string (optional)
 */
export default function LicensePlate({ 
  plateNumber, 
  country = 'KSA', 
  variant = 'default',
  className = ''
}) {
  if (variant === 'compact') {
    return (
      <div className={`bg-surface border border-slate px-2 py-1 rounded plate-container data-mono text-[10px] flex items-center gap-2 ${className}`}>
        <span>{country}</span>
        <span className="font-bold">{plateNumber}</span>
      </div>
    );
  }

  return (
    <div className={`bg-surface border-2 border-on-surface px-2 py-1 rounded plate-container data-mono text-sm font-bold inline-block ${className}`}>
      {plateNumber}
    </div>
  );
}
