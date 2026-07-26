import MetricCard from '../../components/common/MetricCard';
import RevenueChart from '../../components/common/RevenueChart';
import RepairTypesChart from '../../components/common/RepairTypesChart';
import StatusBadge from '../../components/common/StatusBadge';
import {
  metricsData,
  revenueChartData,
  repairTypesData,
} from '../../mock/admin/dashboard';
import { workOrdersData } from '../../mock/admin/workOrders';

import PageHeader from '../../components/common/PageHeader';

/**
 * AdminDashboardPage — Main admin dashboard (لوحة التحكم العامة).
 * Assembles: PageHeader, MetricsGrid, Charts, WorkOrdersTable.
 */
export default function AdminDashboardPage() {
  return (
    <>
      {/* Page Header */}
      <PageHeader 
        title="لوحة التحكم العامة"
        subtitle="أهلاً بك مجدداً، إليك ملخص نشاط الورشة لهذا اليوم."
        actionLabel="أمر عمل جديد"
        actionIcon="add_circle"
      />

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricsData.map((metric) => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <RevenueChart data={revenueChartData} />
        <RepairTypesChart data={repairTypesData} />
      </div>

      {/* Recent Work Orders Table */}
      <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-slate-50/50">
          <h4 className="font-bold text-inverse-surface">
            أوامر العمل الأخيرة
          </h4>
          <button className="text-primary text-xs font-bold hover:underline">
            عرض الكل
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-secondary text-xs uppercase">
                <th className="px-6 py-4 font-bold">رقم الأمر</th>
                <th className="px-6 py-4 font-bold">العميل</th>
                <th className="px-6 py-4 font-bold">المركبة</th>
                <th className="px-6 py-4 font-bold">الفني المسؤول</th>
                <th className="px-6 py-4 font-bold text-center">الحالة</th>
                <th className="px-6 py-4 font-bold text-left">
                  التكلفة الإجمالية
                </th>
                <th className="px-6 py-4 font-bold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {workOrdersData.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {/* Order Number */}
                  <td
                    className="px-6 py-4 text-sm text-inverse-surface"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {order.orderNumber}
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-inverse-surface">
                      {order.customer.name}
                    </p>
                    <p className="text-[11px] text-secondary">
                      {order.customer.phone}
                    </p>
                  </td>

                  {/* Vehicle */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {order.vehicle.plate}
                      </div>
                      <span className="text-xs text-secondary">
                        {order.vehicle.model}
                      </span>
                    </div>
                  </td>

                  {/* Technician */}
                  <td className="px-6 py-4 text-xs text-secondary">
                    {order.technician}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <StatusBadge
                        variant={order.status.variant}
                        label={order.status.label}
                      />
                    </div>
                  </td>

                  {/* Total Cost */}
                  <td
                    className="px-6 py-4 text-left font-bold text-inverse-surface"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {order.totalCost}{' '}
                    <span
                      className="text-[10px] text-secondary"
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                    >
                      {order.currency}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-left">
                    <button
                      className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-slate-200 rounded-lg"
                      aria-label="خيارات إضافية"
                    >
                      <span className="material-symbols-outlined text-xl">
                        more_vert
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
