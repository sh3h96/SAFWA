/**
 * BookingSettingsTab — Shifts, prayer breaks, max daily capacity, slot duration.
 */
export default function BookingSettingsTab({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
        <h3 className="text-lg font-bold text-inverse-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">schedule</span>
          ساعات العمل والدوام
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              بداية الدوام اليومي
            </label>
            <input
              type="time"
              value={data.shiftStart}
              onChange={(e) => onChange('booking', 'shiftStart', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-bold focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              نهاية الدوام اليومي
            </label>
            <input
              type="time"
              value={data.shiftEnd}
              onChange={(e) => onChange('booking', 'shiftEnd', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-bold focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              بداية فترة الراحة / الصلاة
            </label>
            <input
              type="time"
              value={data.breakStart}
              onChange={(e) => onChange('booking', 'breakStart', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              نهاية فترة الراحة / الصلاة
            </label>
            <input
              type="time"
              value={data.breakEnd}
              onChange={(e) => onChange('booking', 'breakEnd', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Capacity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-outline-variant">
          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              الحد الأقصى للمواعيد اليومية
            </label>
            <input
              type="number"
              value={data.maxDailyAppointments}
              onChange={(e) =>
                onChange('booking', 'maxDailyAppointments', Number(e.target.value))
              }
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-bold focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              مدة الموعد الافتراضية (بالدقائق)
            </label>
            <input
              type="number"
              value={data.slotDurationMinutes}
              onChange={(e) =>
                onChange('booking', 'slotDurationMinutes', Number(e.target.value))
              }
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-bold focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
