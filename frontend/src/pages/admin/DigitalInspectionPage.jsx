import { useState } from 'react';
import LicensePlate from '../../components/common/LicensePlate';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/ui/SearchInput';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { inspectionResponse } from '../../mock/admin/inspection';

export default function DigitalInspectionPage() {
  const [data] = useState(inspectionResponse);
  const [checklist, setChecklist] = useState(data.checklist);
  const [photos, setPhotos] = useState(data.photos);
  const [parts, setParts] = useState(data.partsCatalog);
  const [partsSearch, setPartsSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAlert, setSubmittedAlert] = useState(false);

  // Toggle checklist item
  const handleToggleItem = (id) => {
    setChecklist(checklist.map(item => {
      if (item.id === id) {
        const nextChecked = !item.checked;
        return {
          ...item,
          checked: nextChecked,
          statusLabel: nextChecked ? 'سليم (Pass)' : 'يتطلب اهتمام',
          statusVariant: nextChecked ? 'success' : 'warning'
        };
      }
      return item;
    }));
  };

  // Delete Photo
  const handleDeletePhoto = (id) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  // Add Photo
  const handleAddPhoto = () => {
    const newPhoto = {
      id: `ph_${Date.now()}`,
      title: `صورة فحص جديدة ${photos.length + 1}`,
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNViGmGVq1Nao7XXc5_CzpvW8gcPHtVlZ9i-I-_HvKD8tZboC6VQiGq8Mr5af7__-NrEz8G_odrzNHB0e7YGJebvU4r_AyV4OD3qfIVTwq4SfVZfHb2fF5S_GuGzp_y3-40dV0GDzAvinDPAxa_43PQGPKdmg7RRjWVLspVLNPaE0xRqiUyUFo4l0_MbHMGCN9SZR-SjZSRexaRecCecr_4tVxVlBbuZR0W1Xs7_AAIPspSH6tB-btPgt4hrO9GDBUn62fbv-b0tY'
    };
    setPhotos([...photos, newPhoto]);
  };

  // Adjust Part Qty
  const handlePartQty = (id, delta) => {
    setParts(parts.map(p => {
      if (p.id === id) {
        const nextQty = Math.max(0, p.quantity + delta);
        return { ...p, quantity: nextQty };
      }
      return p;
    }));
  };

  // Filter Parts
  const filteredParts = parts.filter(p =>
    p.name.toLowerCase().includes(partsSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(partsSearch.toLowerCase())
  );

  // Submit Report
  const handleSubmitReport = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedAlert(true);
      setTimeout(() => setSubmittedAlert(false), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full">
      {/* Top Page Header */}
      <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-2xl font-bold text-primary">نموذج فحص رقمي</h1>
          <p className="text-sm text-secondary">فحص العناصر الفنية ورفع طلبات قطع الغيار.</p>
        </div>
        <div className="text-xs font-bold text-secondary bg-surface-container px-3 py-1.5 rounded-lg border border-slate">
          آخر فحص: منذ 4 أشهر
        </div>
      </div>

      {/* Success Submitted Banner */}
      {submittedAlert && (
        <div className="bg-success-bg border border-success-text/30 text-success-text p-4 rounded-xl font-bold text-sm flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span>تم رفع تقرير الفحص بنجاح إلى مدير الورشة للاعتماد!</span>
          </div>
          <button onClick={() => setSubmittedAlert(false)} className="text-xs underline">
            إغلاق
          </button>
        </div>
      )}

      {/* Inspection Header Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vehicle Info Card (2 cols) */}
        <div className="md:col-span-2 bg-white border border-border-slate rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-bold">تفاصيل المركبة</p>
            <h2 className="text-2xl font-bold text-on-surface mb-3">{data.vehicle.model}</h2>
            <div className="flex items-center gap-4">
              <LicensePlate plateNumber={data.vehicle.plateNumber} />
              <span className="bg-surface-container-high px-3 py-1 rounded-full text-xs font-medium text-on-surface-variant">
                {data.vehicle.color}
              </span>
            </div>
          </div>

          <div className="bg-primary-container/10 p-4 rounded-xl border border-primary/20 text-center min-w-[140px]">
            <p className="text-xs text-primary font-bold mb-1">رقم أمر العمل</p>
            <p className="data-mono text-xl text-primary font-bold">{data.workOrder}</p>
          </div>
        </div>

        {/* Overall Status Circle Card (1 col) */}
        <div className="bg-white border border-border-slate rounded-xl p-6 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-on-surface-variant mb-4 font-bold">حالة الفحص الإجمالية</p>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path 
                  className="text-surface-container-high stroke-current" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  fill="none" 
                  strokeWidth="4" 
                />
                <path 
                  className="text-success-text stroke-current" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  fill="none" 
                  strokeDasharray={`${data.progress.percentage}, 100`} 
                  strokeLinecap="round" 
                  strokeWidth="4" 
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center data-mono text-sm font-bold text-on-surface">
                {data.progress.percentage}%
              </span>
            </div>

            <div>
              <p className="text-sm font-bold text-on-surface">{data.progress.statusText}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                تم إكمال {data.progress.completedItems} من {data.progress.totalItems} بنود
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Checklist */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-lg text-on-surface">بنود الفحص الفني</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {checklist.map((item) => (
            <div 
              key={item.id}
              className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all ${
                item.statusVariant === 'warning' ? 'border-border-slate ring-2 ring-warning-text/20' : 'border-border-slate'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-2.5 rounded-lg ${
                  item.statusVariant === 'warning' ? 'bg-warning-bg' : 'bg-surface-container'
                }`}>
                  <span className={`material-symbols-outlined text-2xl ${
                    item.statusVariant === 'warning' ? 'text-warning-text' : 'text-primary'
                  }`}>
                    {item.icon}
                  </span>
                </div>

                <ToggleSwitch 
                  checked={item.checked} 
                  onChange={() => handleToggleItem(item.id)} 
                />
              </div>

              <h4 className="font-bold text-base text-on-surface mb-1">{item.title}</h4>
              <p className="text-xs text-on-surface-variant mb-4">{item.subtitle}</p>

              <StatusBadge 
                variant={item.statusVariant} 
                label={item.statusLabel} 
              />
            </div>
          ))}
        </div>
      </section>

      {/* Photo Upload Documentation */}
      <section className="space-y-4">
        <h3 className="font-bold text-lg text-on-surface px-1">توثيق الأعطال بالصور</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-video overflow-hidden rounded-xl border border-border-slate shadow-sm">
              <img className="w-full h-full object-cover" src={photo.url} alt={photo.title} />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 p-3">
                <p className="text-white text-xs font-bold">{photo.title}</p>
              </div>
              <button 
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute top-2 right-2 bg-danger-bg text-danger-text p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                title="حذف الصورة"
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          ))}

          <button 
            onClick={handleAddPhoto}
            className="border-2 border-dashed border-outline-variant rounded-xl aspect-video flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-2xl">add_a_photo</span>
            </div>
            <p className="text-sm font-bold text-on-surface-variant">إضافة صورة</p>
          </button>
        </div>
      </section>

      {/* Spare Parts Picker */}
      <section className="space-y-4">
        <h3 className="font-bold text-lg text-on-surface px-1">طلب قطع الغيار</h3>
        <div className="bg-white border border-border-slate rounded-xl p-6 shadow-sm space-y-6">
          <SearchInput 
            value={partsSearch}
            onChange={(e) => setPartsSearch(e.target.value)}
            placeholder="ابحث عن اسم القطعة أو الرقم التسلسلي..."
          />

          <div className="space-y-3">
            {filteredParts.map((part) => (
              <div key={part.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-border-slate/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-border-slate text-primary">
                    <span className="material-symbols-outlined text-2xl">{part.icon}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">{part.name}</p>
                    <p className="text-xs text-on-surface-variant data-mono mt-0.5">{part.sku}</p>
                  </div>
                </div>

                <div className="flex items-center bg-white border border-border-slate rounded-lg p-1">
                  <button 
                    onClick={() => handlePartQty(part.id, 1)}
                    className="w-8 h-8 flex items-center justify-center text-primary hover:bg-surface-container transition-colors rounded"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                  </button>

                  <span className="w-10 text-center data-mono font-bold text-sm text-on-surface">
                    {part.quantity}
                  </span>

                  <button 
                    onClick={() => handlePartQty(part.id, -1)}
                    className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors rounded"
                  >
                    <span className="material-symbols-outlined text-base">remove</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredParts.length === 0 && (
              <p className="text-center text-xs text-secondary py-4">
                لا توجد نتائج مطابقة للبحث
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Technician Notes */}
      <section className="space-y-3">
        <h3 className="font-bold text-lg text-on-surface px-1">ملاحظات الفني</h3>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أضف أي تفاصيل إضافية أو توصيات خاصة بالمركبة..."
          className="w-full h-32 p-4 bg-white border border-border-slate rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm resize-none shadow-sm"
        />
      </section>

      {/* Submit Action Button */}
      <div className="pt-2 pb-8">
        <button 
          onClick={handleSubmitReport}
          disabled={isSubmitting}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-teal-hover active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined animate-spin">sync</span>
              <span>جاري رفع التقرير...</span>
            </>
          ) : (
            <>
              <span>رفع التقرير للمدير للاعتماد</span>
              <span className="material-symbols-outlined">cloud_upload</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
