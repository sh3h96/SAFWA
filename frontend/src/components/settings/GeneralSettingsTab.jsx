/**
 * GeneralSettingsTab — Workshop name, CR, VAT ID, contact details, address.
 */
export default function GeneralSettingsTab({ data, onChange }) {
  return (
    <div className="space-y-6">
      {/* Primary Workshop Info */}
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
        <h3 className="text-lg font-bold text-inverse-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">storefront</span>
          البيانات الرئيسية للمركز
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              اسم المركز / الورشة
            </label>
            <input
              type="text"
              value={data.workshopName}
              onChange={(e) => onChange('general', 'workshopName', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              رقم السجل التجاري (CR)
            </label>
            <input
              type="text"
              value={data.crNumber}
              onChange={(e) => onChange('general', 'crNumber', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-mono focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              الرقم الضريبي (VAT ID)
            </label>
            <input
              type="text"
              value={data.vatNumber}
              onChange={(e) => onChange('general', 'vatNumber', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-mono focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              العملة الافتراضية
            </label>
            <input
              type="text"
              value={data.currency}
              onChange={(e) => onChange('general', 'currency', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Contact & Location */}
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
        <h3 className="text-lg font-bold text-inverse-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">location_on</span>
          بيانات التواصل والعنوان
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              الهاتف الثابت
            </label>
            <input
              type="text"
              value={data.phone}
              onChange={(e) => onChange('general', 'phone', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              رقم الجوال الخاص بالمركز
            </label>
            <input
              type="text"
              value={data.mobile}
              onChange={(e) => onChange('general', 'mobile', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              البريد الإلكتروني الرسمي
            </label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => onChange('general', 'email', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              الموقع الإلكتروني
            </label>
            <input
              type="text"
              value={data.website}
              onChange={(e) => onChange('general', 'website', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-secondary mb-2">
              العنوان التفصيلي (يظهر بالفواتير)
            </label>
            <input
              type="text"
              value={data.address}
              onChange={(e) => onChange('general', 'address', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
