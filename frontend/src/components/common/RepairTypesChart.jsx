/**
 * RepairTypesChart — Reusable donut chart component (future-ready).
 *
 * Current implementation: CSS-only donut visualization matching the HTML source.
 * Future: Replace inner render with a charting library while keeping same props.
 *
 * Props:
 * - data: { totalOrders: number, types: [{ type, percentage, dotClass }] }
 */
export default function RepairTypesChart({ data }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col">
      {/* Title */}
      <h4 className="font-bold text-inverse-surface mb-6">
        توزيع أنواع الإصلاحات
      </h4>

      {/* Donut Visualization */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className="w-40 h-40 rounded-full border-[18px] border-slate-100 flex items-center justify-center relative overflow-hidden">
          {/* CSS donut segments via border colors */}
          <div className="absolute inset-0 border-[18px] border-t-primary border-r-primary-container border-b-secondary/50 border-l-warning-text/40 rounded-full" />
          {/* Center content */}
          <div className="text-center">
            <p className="text-2xl font-bold text-inverse-surface">
              {data.totalOrders}
            </p>
            <p className="text-[10px] text-secondary">إجمالي الطلبات</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3 mt-6">
        {data.types.map((item) => (
          <div key={item.type} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
              <span className="text-xs text-secondary">{item.type}</span>
            </div>
            <span className="text-xs font-bold text-inverse-surface">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
