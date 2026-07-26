/**
 * DataTable — Reusable data table component.
 * 
 * Props:
 * - columns: Array of { key, label, render(item) }
 * - data: Array of objects
 * - title: string
 * - actions: ReactNode (e.g. filter/download buttons)
 * - pagination: ReactNode (e.g. Pagination component)
 */
export default function DataTable({ columns, data, title, actions, pagination }) {
  return (
    <div className="bg-white rounded-xl border border-border-slate shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-bold text-lg text-on-background">{title}</h3>
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead className="bg-surface-container-low text-on-surface-variant font-bold text-sm uppercase tracking-wider">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-4 border-b border-outline-variant whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-surface-container-lowest transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-on-surface-variant">
                  لا توجد بيانات للعرض
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination}
    </div>
  );
}
