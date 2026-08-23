import toast from 'react-hot-toast';

/**
 * SecuritySettingsTab — 2FA, session timeout, language, automated backups.
 */
export default function SecuritySettingsTab({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
        <h3 className="text-lg font-bold text-inverse-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">shield</span>
          الأمان وصلاحيات النظام
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant">
            <div>
              <p className="text-sm font-bold text-inverse-surface">
                التحقق بخطوتين (2FA) لمسؤولي النظام
              </p>
              <p className="text-xs text-secondary">
                طلب كود تحقق عبر SMS أو التطبيق عند تسجيل الدخول من جهاز جديد.
              </p>
            </div>
            <input
              type="checkbox"
              checked={data.twoFactorAuth}
              onChange={(e) =>
                onChange('security', 'twoFactorAuth', e.target.checked)
              }
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
              <label className="block text-xs font-bold text-secondary mb-2">
                مهلة الجلسة عند عدم النشاط (بالدقائق)
              </label>
              <input
                type="number"
                value={data.sessionTimeoutMinutes}
                onChange={(e) =>
                  onChange('security', 'sessionTimeoutMinutes', Number(e.target.value))
                }
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-bold focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-2">
                لغة اللوحة الافتراضية
              </label>
              <select
                value={data.systemLanguage}
                onChange={(e) =>
                  onChange('security', 'systemLanguage', e.target.value)
                }
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-sm font-bold focus:ring-primary focus:border-primary"
              >
                <option value="ar">العربية (Arabic - RTL)</option>
                <option value="en">English (LTR)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* System Backup */}
      <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-inverse-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">cloud_download</span>
              النسخ الاحتياطي واستعادة البيانات
            </h3>
            <p className="text-xs text-secondary mt-1">
              آخر نسخة احتياطية تمت بتاريخ: {data.lastBackupDate}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              toast.info('جارٍ إنشاء نسخة احتياطية كاملة لقاعدة البيانات...');
            }}
            className="flex items-center gap-2 bg-inverse-surface hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">backup</span>
            تصدير نسخة الآن
          </button>
        </div>

        <div className="p-4 bg-surface border border-outline-variant rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-inverse-surface">
              جدولة النسخ الاحتياطي التلقائي
            </p>
            <p className="text-xs text-secondary">
              التكرار: {data.backupFrequency}
            </p>
          </div>
          <input
            type="checkbox"
            checked={data.autoBackupEnabled}
            onChange={(e) =>
              onChange('security', 'autoBackupEnabled', e.target.checked)
            }
            className="w-5 h-5 accent-primary cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
