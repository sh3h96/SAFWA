/**
 * SearchInput — Reusable search field component with search icon.
 * 
 * Props:
 * - value: string
 * - onChange: function(e)
 * - placeholder: string
 * - className: string (optional)
 */
export default function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'بحث...', 
  className = '' 
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
        search
      </span>
      <input 
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pr-10 pl-4 py-2 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all text-sm"
      />
    </div>
  );
}
