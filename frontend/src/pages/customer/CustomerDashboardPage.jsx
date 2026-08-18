import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LicensePlate from '../../components/common/LicensePlate';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import { customerResponse } from '../../mock/customer/customer';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const [data] = useState(customerResponse);
  const [selectedVehicleId, setSelectedVehicleId] = useState(data.vehicles[0].id);

  const selectedVehicle = data.vehicles.find(v => v.id === selectedVehicleId) || data.vehicles[0];

  // Invoices table columns
  const invoiceColumns = [
    {
      key: 'id',
      label: 'رقم الفاتورة',
      render: (row) => <span className="data-mono font-bold text-on-surface">{row.id}</span>
    },
    {
      key: 'service',
      label: 'الخدمة',
      render: (row) => <span className="text-sm font-medium text-on-surface">{row.service}</span>
    },
    {
      key: 'date',
      label: 'التاريخ',
      render: (row) => <span className="text-sm text-secondary">{row.date}</span>
    },
    {
      key: 'amount',
      label: 'المبلغ (ر.س)',
      render: (row) => <span className="data-mono font-bold text-primary">{formatCurrency(row.amount)}</span>
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (row) => <StatusBadge variant="success" label={row.statusLabel} />,
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button 
          onClick={() => toast.success(`جاري تحميل الفاتورة ${row.id}`)}
          className="text-secondary hover:text-primary transition-colors p-1"
          title="تحميل"
        >
          <span className="material-symbols-outlined text-lg">download</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-8 max-w-[1320px] mx-auto">
      {/* Greeting Header & Vehicle Selector Pill */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border-slate">
        <div>
          <h1 className="text-3xl font-bold text-on-background">مرحباً بك، {data.profile.name}</h1>
          <p className="text-sm text-secondary mt-1">إليك نظرة سريعة على حالة صيانة مركباتك اليوم.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Vehicle Selector Pill */}
          <div className="bg-white border border-border-slate p-1.5 px-3 rounded-full flex items-center gap-3 shadow-sm">
            <div className="bg-surface-container px-3 py-1 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">directions_car</span>
              <span className="font-bold text-xs text-on-surface">{selectedVehicle.model}</span>
            </div>
            <LicensePlate plateNumber={selectedVehicle.plateNumber} variant="compact" />
          </div>

          <button 
            onClick={() => navigate('/client/booking')}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-hover transition-all active:scale-95 shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>حجز موعد جديد</span>
          </button>
        </div>
      </div>

      {/* Hero Section: Live Repair Progress Pipeline */}
      <section className="bg-white border border-border-slate rounded-xl p-6 md:p-8 overflow-hidden relative shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-7 bg-primary rounded-full" />
            <h2 className="text-xl font-bold text-on-surface">متابعة الإصلاح المباشرة</h2>
          </div>
          <span className="bg-info-bg text-info-text px-3.5 py-1 rounded-full text-xs font-bold data-mono border border-info-text/20">
            رقم الإصلاح: {data.activeRepair.repairNumber}
          </span>
        </div>

        {/* Pipeline Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          {data.activeRepair.steps.map((step) => {
            if (step.status === 'completed') {
              return (
                <div key={step.id} className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-success-bg border-2 border-success-text flex items-center justify-center text-success-text shadow-sm">
                    <span className="material-symbols-outlined text-2xl font-bold">check</span>
                  </div>
                  <span className="text-sm font-bold text-success-text">{step.title}</span>
                  <span className="text-xs text-secondary">{step.time}</span>
                </div>
              );
            }

            if (step.status === 'active') {
              return (
                <div key={step.id} className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg ring-4 ring-primary/20 animate-pulse">
                    <span className="material-symbols-outlined text-2xl animate-spin" style={{ animationDuration: '6s' }}>
                      settings
                    </span>
                  </div>
                  <span className="text-sm font-bold text-primary">{step.title}</span>
                  <span className="text-xs text-primary/80 font-medium italic">{step.time}</span>
                </div>
              );
            }

            return (
              <div key={step.id} className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-container border-2 border-outline-variant flex items-center justify-center text-outline-variant">
                  <span className="material-symbols-outlined text-2xl">schedule</span>
                </div>
                <span className="text-sm font-bold text-outline-variant">{step.title}</span>
                <span className="text-xs text-secondary">{step.time}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Content Grid (Recent Invoices + Quick Actions) */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Recent Invoices Table (Span 8) */}
        <section className="col-span-12 lg:col-span-8 bg-white border border-border-slate rounded-xl shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-border-slate flex items-center justify-between">
            <h2 className="text-lg font-bold text-on-surface">الفواتير الأخيرة</h2>
            <button 
              onClick={() => navigate('/client/billing')}
              className="text-primary text-xs font-bold hover:underline flex items-center gap-1"
            >
              <span>عرض الكل</span>
              <span className="material-symbols-outlined text-sm">arrow_back</span>
            </button>
          </div>

          <DataTable 
            columns={invoiceColumns}
            data={data.recentInvoices}
          />
        </section>

        {/* Quick Actions Panel (Span 4) */}
        <section className="col-span-12 lg:col-span-4 space-y-4">
          {/* Action 1 */}
          <div 
            onClick={() => navigate('/client/vehicles')}
            className="group bg-white border border-border-slate p-5 rounded-xl flex items-center justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-2xl">garage</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface">مركباتي</h3>
                <p className="text-xs text-secondary mt-0.5">إدارة السيارات المسجلة</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
          </div>

          {/* Action 2 */}
          <div 
            onClick={() => navigate('/client/appointments')}
            className="group bg-white border border-border-slate p-5 rounded-xl flex items-center justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-2xl">history_edu</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface">سجل الصيانة</h3>
                <p className="text-xs text-secondary mt-0.5">تاريخ الإصلاحات السابقة</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
          </div>

          {/* Action 3 */}
          <div 
            onClick={() => navigate('/client/reviews')}
            className="group bg-white border border-border-slate p-5 rounded-xl flex items-center justify-between hover:shadow-md hover:border-primary/40 transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-2xl">star_rate</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface">تقييم الخدمة</h3>
                <p className="text-xs text-secondary mt-0.5">شاركنا رأيك في تجربتك</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
