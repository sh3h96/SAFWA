/**
 * NotificationsSettingsTab — WhatsApp alerts, SMS status updates, email reports.
 */
export default function NotificationsSettingsTab({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
        <h3 className="text-lg font-bold text-inverse-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">chat</span>
          تنبيهات الواتساب والرسائل القصيرة SMS
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant">
            <div>
              <p className="text-sm font-bold text-inverse-surface">
                إرسال تحديث حالة الصيانة للعميل عبر WhatsApp
              </p>
              <p className="text-xs text-secondary">
                إرسال رسالة تلقائية عند نقل السيارة إلى فحص، تحت الصيانة، أو جاهزة للاستلام.
              </p>
            </div>
            <input
              type="checkbox"
              checked={data.whatsappStatusUpdates}
              onChange={(e) =>
                onChange('notifications', 'whatsappStatusUpdates', e.target.checked)
              }
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant">
            <div>
              <p className="text-sm font-bold text-inverse-surface">
                إرسال الفاتورة الإلكترونية عبر WhatsApp
              </p>
              <p className="text-xs text-secondary">
                مشاركة رابط الفاتورة مع كود QR فور إصدارها.
              </p>
            </div>
            <input
              type="checkbox"
              checked={data.whatsappInvoicePdf}
              onChange={(e) =>
                onChange('notifications', 'whatsappInvoicePdf', e.target.checked)
              }
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant">
            <div>
              <p className="text-sm font-bold text-inverse-surface">
                إرسال تقرير الفحص الرقمي SMS
              </p>
              <p className="text-xs text-secondary">
                إشعار صاحب المركبة برابط نتائج الفحص والموافقات المطلوبة.
              </p>
            </div>
            <input
              type="checkbox"
              checked={data.smsInspectionAlerts}
              onChange={(e) =>
                onChange('notifications', 'smsInspectionAlerts', e.target.checked)
              }
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Email & Stock Alerts */}
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
        <h3 className="text-lg font-bold text-inverse-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">mark_email_read</span>
          تقارير البريد وإشعارات النواقص
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              البريد الإلكتروني لاستلام التقرير اليومي
            </label>
            <input
              type="email"
              value={data.managerEmail}
              onChange={(e) =>
                onChange('notifications', 'managerEmail', e.target.value)
              }
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-2">
              حد تنبيه مخزون قطع الغيار (الحد الأدنى)
            </label>
            <input
              type="number"
              value={data.lowStockThreshold}
              onChange={(e) =>
                onChange('notifications', 'lowStockThreshold', Number(e.target.value))
              }
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-bold focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
