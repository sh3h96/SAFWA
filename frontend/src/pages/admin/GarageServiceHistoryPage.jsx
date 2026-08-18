import { useState } from 'react';
import SelectInput from '../../components/ui/SelectInput';
import StatusBadge from '../../components/common/StatusBadge';
import { garageResponse } from '../../mock/admin/garage';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function GarageServiceHistoryPage() {
  const [vehicles] = useState(garageResponse.vehicles);
  const [activeVehicleId, setActiveVehicleId] = useState(vehicles[0].id);
  const [selectedServiceType, setSelectedServiceType] = useState('نوع الخدمة (الكل)');
  const [selectedYear, setSelectedYear] = useState('السنة (الكل)');

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0];

  // Filter history nodes
  const filteredNodes = garageResponse.historyNodes.filter((node) => {
    const matchesVehicle = node.vehicleId === activeVehicleId;
    const matchesService = 
      selectedServiceType === 'نوع الخدمة (الكل)' || node.serviceType === selectedServiceType;
    const matchesYear = 
      selectedYear === 'السنة (الكل)' || node.year === selectedYear;

    return matchesVehicle && matchesService && matchesYear;
  });

  const handleAddVehicle = () => {
    toast.info('إضافة سيارة جديدة للمرآب');
  };

  const handleNewRepair = () => {
    toast.info(`تسجيل عملية إصلاح جديدة لسيارة ${activeVehicle.name}`);
  };

  return (
    <div className="space-y-8 max-w-[1320px] mx-auto">
      {/* Top Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-background">مرآب السيارات وسجل الصيانة</h1>
          <p className="text-sm text-secondary mt-1">تتبع تاريخ وسجلات الصيانة لكل مركبة.</p>
        </div>
        <button 
          onClick={handleAddVehicle}
          className="text-primary font-bold text-sm hover:underline"
        >
          عرض الكل ({vehicles.length})
        </button>
      </div>

      {/* Horizontal Vehicles Selector Carousel */}
      <div className="flex gap-6 overflow-x-auto pb-2 no-scrollbar">
        {/* Add New Card */}
        <div 
          onClick={handleAddVehicle}
          className="min-w-[240px] h-[140px] border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-low transition-colors group shrink-0"
        >
          <div className="w-10 h-10 rounded-full border-2 border-outline border-dashed flex items-center justify-center text-outline group-hover:border-primary group-hover:text-primary mb-2 transition-colors">
            <span className="material-symbols-outlined">add</span>
          </div>
          <span className="text-sm font-bold text-on-surface-variant group-hover:text-primary transition-colors">
            إضافة سيارة جديدة
          </span>
        </div>

        {/* Vehicle Cards */}
        {vehicles.map((v) => {
          const isSelected = v.id === activeVehicleId;
          return (
            <div 
              key={v.id}
              onClick={() => setActiveVehicleId(v.id)}
              className={`min-w-[280px] p-5 rounded-xl transition-all cursor-pointer shrink-0 shadow-sm ${
                isSelected 
                  ? 'bg-primary text-white shadow-lg scale-[1.01]' 
                  : 'bg-white text-on-surface border border-border-slate hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-white backdrop-blur-md' : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {v.plateNumber}
                </div>
                <span className={`material-symbols-outlined ${isSelected ? 'text-white/60' : 'text-outline'}`}>
                  directions_car
                </span>
              </div>
              <h3 className={`font-bold text-base mb-1 ${isSelected ? 'text-white' : 'text-on-surface'}`}>
                {v.name}
              </h3>
              <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-on-surface-variant'}`}>
                تاريخ الإضافة: {v.addedDate}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Detailed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Active Vehicle Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-border-slate p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-on-background">تفاصيل السيارة الحالية</h3>
              <button 
                className="text-primary hover:bg-primary-fixed/30 p-2 rounded-full transition-colors"
                title="تعديل"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            </div>

            {/* Vehicle Image */}
            <div className="relative w-full h-48 rounded-xl overflow-hidden bg-surface-container-low border border-slate shadow-inner">
              <img 
                className="w-full h-full object-cover" 
                src={activeVehicle.image} 
                alt={activeVehicle.name} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-on-surface-variant block mb-1 font-bold">
                  رقم الهيكل (VIN)
                </label>
                <div className="bg-surface-container px-3 py-2.5 rounded-lg data-mono text-xs font-bold text-on-surface border border-outline-variant">
                  {activeVehicle.vin}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface-container-low rounded-xl border border-border-slate">
                  <span className="text-xs text-on-surface-variant block mb-1">عداد المسافات</span>
                  <span className="font-bold text-sm text-on-background">{activeVehicle.odometer}</span>
                </div>
                <div className="p-4 bg-surface-container-low rounded-xl border border-border-slate">
                  <span className="text-xs text-on-surface-variant block mb-1">آخر صيانة</span>
                  <span className="font-bold text-sm text-on-background">{activeVehicle.lastServiceDate}</span>
                </div>
              </div>

              <button 
                onClick={handleNewRepair}
                className="w-full py-3 bg-primary-container hover:bg-teal-hover text-white rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                <span>تسجيل عملية إصلاح جديدة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Service History Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-border-slate p-6 shadow-sm space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-outline-variant">
              <div className="flex-1 min-w-[140px]">
                <SelectInput 
                  value={selectedServiceType}
                  onChange={(e) => setSelectedServiceType(e.target.value)}
                  options={garageResponse.serviceTypes}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <SelectInput 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  options={garageResponse.years}
                />
              </div>
              <button 
                className="bg-surface-container p-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                title="تصفية"
              >
                <span className="material-symbols-outlined text-lg">filter_list</span>
              </button>
            </div>

            <h3 className="font-bold text-lg text-on-background">سجل الخدمات والعمليات</h3>

            {/* Timeline List */}
            <div className="space-y-6 relative pr-2">
              {filteredNodes.map((node, index) => (
                <div key={node.id} className="relative pb-6 flex gap-6">
                  {/* Timeline Dot Indicator */}
                  <div className="relative z-10 pt-1">
                    <div className={`w-6 h-6 rounded-full border-4 border-white ring-1 flex items-center justify-center ${
                      index === 0 
                        ? 'bg-primary-container ring-primary-container' 
                        : 'bg-surface-variant ring-outline-variant'
                    }`} />
                  </div>

                  {/* Node Content Box */}
                  <div className="flex-1 bg-surface-container-low p-5 rounded-xl border border-border-slate hover:border-primary-container/50 transition-colors space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-base text-on-background">{node.title}</h4>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {node.date} | {node.technician}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="data-mono font-bold text-base text-primary">
                          {formatCurrency(node.cost)}
                        </span>
                        {node.hasInvoice && (
                          <button 
                            onClick={() => toast.success(`جاري تحميل فاتورة ${node.title}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-slate rounded-lg text-xs hover:bg-surface transition-all font-bold"
                          >
                            <span className="material-symbols-outlined text-sm text-danger-text">picture_as_pdf</span>
                            <span>الفاتورة</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {node.status && (
                      <div className="inline-block">
                        <StatusBadge variant="success" label={node.statusLabel} />
                      </div>
                    )}

                    {/* Parts Thumbnails section */}
                    {node.partsPhotos && (
                      <div className="pt-2">
                        <p className="text-xs font-bold text-on-surface-variant mb-2">
                          {node.partsTitle}
                        </p>
                        <div className="flex gap-2 items-center">
                          {node.partsPhotos.map((photoUrl, i) => (
                            <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-outline-variant bg-white shrink-0">
                              <img className="w-full h-full object-cover" src={photoUrl} alt="قطعة غيار" />
                            </div>
                          ))}
                          {node.extraPartsCount && (
                            <div className="w-14 h-14 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant data-mono text-xs font-bold shrink-0">
                              +{node.extraPartsCount}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredNodes.length === 0 && (
                <p className="text-center text-xs text-secondary py-8">
                  لا توجد عمليات صيانة مسجلة لهذه السيارة في السجل حالياً.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
