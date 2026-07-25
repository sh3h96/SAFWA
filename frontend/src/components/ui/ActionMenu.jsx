/**
 * ActionMenu — Reusable context menu button (three vertical dots).
 * Currently just a button; can be expanded into a dropdown menu later.
 * 
 * Props:
 * - onClick: function (optional)
 */
export default function ActionMenu({ onClick }) {
  return (
    <button 
      onClick={onClick}
      className="p-2 text-on-surface-variant hover:text-primary transition-colors"
      aria-label="خيارات إضافية"
    >
      <span className="material-symbols-outlined">more_vert</span>
    </button>
  );
}
