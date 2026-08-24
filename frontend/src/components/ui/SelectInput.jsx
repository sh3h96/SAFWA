/**
 * SelectInput — Reusable select dropdown component.
 * 
 * Props:
 * - value: string|number
 * - onChange: function(e)
 * - options: Array of string or { label, value }
 * - placeholder: string (optional)
 * - className: string (optional)
 */
export default function SelectInput({
  value,
  onChange,
  options = [],
  className = ''
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`w-full px-4 py-2 bg-surface-container rounded-lg border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none transition-all text-sm ${className}`}
    >
      {options.map((opt, i) => {
        const isObj = typeof opt === 'object' && opt !== null;
        const val = isObj ? opt.value : opt;
        const lbl = isObj ? opt.label : opt;
        return (
          <option key={val || i} value={val}>
            {lbl}
          </option>
        );
      })}
    </select>
  );
}
