import { useState, useRef, useEffect } from 'react';

export default function MultiSelect({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = 'اختر الفنيين للمهمة...',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize selectedValues to array of numbers
  const currentSelected = Array.isArray(selectedValues)
    ? selectedValues.map(v => Number(v))
    : (selectedValues ? [Number(selectedValues)] : []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id) => {
    const numericId = Number(id);
    let updated;
    if (currentSelected.includes(numericId)) {
      updated = currentSelected.filter(v => v !== numericId);
    } else {
      updated = [...currentSelected, numericId];
    }
    onChange(updated);
  };

  const removeChip = (e, id) => {
    e.stopPropagation();
    onChange(currentSelected.filter(v => v !== Number(id)));
  };

  const selectedOptions = options.filter(opt => currentSelected.includes(Number(opt.id)));

  return (
    <div ref={containerRef} className="relative w-full text-right dir-rtl">
      {/* Selector Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[44px] px-3 py-2 bg-slate-50 border rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all ${
          isOpen ? 'border-primary ring-2 ring-primary/20 bg-white' : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {selectedOptions.length === 0 ? (
            <span className="text-sm font-medium text-slate-400 select-none">{placeholder}</span>
          ) : (
            selectedOptions.map(opt => (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-100 rounded-lg text-xs font-bold animate-in zoom-in-95 duration-150"
              >
                <span>{opt.name}</span>
                <button
                  type="button"
                  onClick={(e) => removeChip(e, opt.id)}
                  className="hover:text-teal-950 focus:outline-none rounded-full p-0.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedOptions.length > 0 && (
            <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-full font-mono">
              {selectedOptions.length}
            </span>
          )}
          <span className={`material-symbols-outlined text-lg transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`}>
            keyboard_arrow_down
          </span>
        </div>
      </div>

      {/* Dropdown Options Container */}
      {isOpen && (
        <div className="absolute z-50 top-full right-0 left-0 mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
            <span>قائمة الفنيين المتاحين</span>
            <span>تعدد الاختيار</span>
          </div>

          {options.length === 0 ? (
            <div className="p-4 text-center text-xs font-bold text-slate-400">لا يوجد فنيون متاحون حالياً</div>
          ) : (
            options.map(opt => {
              const isSelected = currentSelected.includes(Number(opt.id));
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-sm font-bold transition-all ${
                    isSelected
                      ? 'bg-teal-50/80 text-teal-800 border border-teal-100/80'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {opt.name?.charAt(0) || 'م'}
                    </div>
                    <span>{opt.name}</span>
                  </div>

                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
