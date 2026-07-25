/**
 * Pagination — Reusable table pagination component.
 * 
 * Props:
 * - total: number
 * - currentStart: number
 * - currentEnd: number
 * - onNext: function
 * - onPrev: function
 * - hasNext: boolean
 * - hasPrev: boolean
 */
export default function Pagination({ 
  total, 
  currentStart, 
  currentEnd, 
  onNext, 
  onPrev,
  hasNext,
  hasPrev
}) {
  return (
    <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
      <span className="text-caption text-on-surface-variant">
        عرض {currentStart}-{currentEnd} من أصل {total}
      </span>
      <div className="flex gap-2">
        <button 
          onClick={onPrev}
          disabled={!hasPrev}
          className="px-4 py-2 bg-white border border-outline-variant rounded-lg hover:bg-surface-container transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          السابق
        </button>
        <button 
          onClick={onNext}
          disabled={!hasNext}
          className="px-4 py-2 bg-white border border-outline-variant rounded-lg hover:bg-surface-container transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
