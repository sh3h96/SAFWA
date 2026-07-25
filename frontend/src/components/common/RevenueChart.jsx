import { useState } from 'react';

/**
 * RevenueChart — Reusable bar chart component (future-ready).
 *
 * Current implementation: CSS-only bar visualization matching the HTML source.
 * Future: Replace inner render with a charting library (e.g., Recharts, Chart.js)
 *         while keeping the same props interface.
 *
 * Props:
 * - data: { days: [{ day, revenue, laborCost }], legend: [{ label, colorClass }],
 *           timeRange, timeRangeOptions }
 */
export default function RevenueChart({ data }) {
  const [timeRange, setTimeRange] = useState(data.timeRange);

  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-bold text-inverse-surface">
          الإيرادات مقابل تكلفة العمالة
        </h4>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="text-xs border-outline-variant rounded bg-surface px-2 py-1 focus:ring-primary focus:border-primary"
        >
          {data.timeRangeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Bar Chart Area */}
      <div className="h-64 w-full flex items-end justify-between gap-4 px-2">
        {data.days.map((dayData) => (
          <div
            key={dayData.day}
            className="flex flex-col items-center flex-1 gap-2"
          >
            <div className="w-full flex gap-1 items-end h-48">
              <div
                className="bg-primary-container/80 w-1/2 rounded-t transition-all duration-300"
                style={{ height: `${dayData.revenue}%` }}
              />
              <div
                className="bg-secondary/40 w-1/2 rounded-t transition-all duration-300"
                style={{ height: `${dayData.laborCost}%` }}
              />
            </div>
            <span className="text-[10px] text-secondary">{dayData.day}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-6 pt-4 border-t border-slate-50 justify-center">
        {data.legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${item.colorClass}`} />
            <span className="text-xs text-secondary">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
