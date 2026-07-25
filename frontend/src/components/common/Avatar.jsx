/**
 * Avatar — Reusable user avatar component.
 * Supports image or initials fallback.
 *
 * Props:
 * - src: image url (string, optional)
 * - name: user name for alt text (string)
 * - initials: fallback initials (string)
 * - size: 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 */
export default function Avatar({ src, name, initials, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div 
      className={`${currentSize} rounded-full bg-slate-200 border border-outline-variant overflow-hidden flex items-center justify-center shrink-0`}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-bold text-inverse-surface">
          {initials}
        </span>
      )}
    </div>
  );
}
