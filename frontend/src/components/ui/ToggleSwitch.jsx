/**
 * ToggleSwitch — Reusable boolean toggle switch.
 * 
 * Props:
 * - checked: boolean
 * - onChange: function(checked)
 * - disabled: boolean (optional)
 */
export default function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={checked} 
        onChange={(e) => !disabled && onChange(e.target.checked)} 
        disabled={disabled}
      />
      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border-slate after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
    </label>
  );
}
