import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import TabBar from '../../components/common/TabBar';
import GeneralSettingsTab from '../../components/settings/GeneralSettingsTab';
import FinancialSettingsTab from '../../components/settings/FinancialSettingsTab';
import BookingSettingsTab from '../../components/settings/BookingSettingsTab';
import NotificationsSettingsTab from '../../components/settings/NotificationsSettingsTab';
import SecuritySettingsTab from '../../components/settings/SecuritySettingsTab';
import SettingsToast from '../../components/settings/SettingsToast';
import { initialSettings } from '../../mock/admin/settings';

/**
 * SettingsPage — Administrative Settings & System Configuration (إعدادات النظام والمركز).
 * Multi-tab container assembling modular tab components.
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState('general');
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'general', label: 'معلومات المركز والورشة' },
    { id: 'financial', label: 'الفواتير والضرائب' },
    { id: 'booking', label: 'ساعات العمل والمواعيد' },
    { id: 'notifications', label: 'الإشعارات والربط' },
    { id: 'security', label: 'الأمان والنسخ الاحتياطي' },
  ];

  // Handler for nested state updates
  const handleChange = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handlePaymentToggle = (method) => {
    setSettings((prev) => ({
      ...prev,
      financial: {
        ...prev.financial,
        paymentMethods: {
          ...prev.financial.paymentMethods,
          [method]: !prev.financial.paymentMethods[method],
        },
      },
    }));
  };

  const handleSave = (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }, 600);
  };

  return (
    <div className="pb-12">
      {/* Toast Notification */}
      {showToast && <SettingsToast onClose={() => setShowToast(false)} />}

      {/* Header */}
      <PageHeader
        title="إعدادات النظام والمركز"
        subtitle="إدارة بيانات مركز صيانة صفوة، الفواتير، ساعات العمل، الإشعارات، وخيارات الأمان."
        actionLabel={isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
        actionIcon={isSaving ? 'sync' : 'save'}
        onAction={handleSave}
      />

      {/* Tab Navigation */}
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {activeTab === 'general' && (
          <GeneralSettingsTab
            data={settings.general}
            onChange={handleChange}
          />
        )}

        {activeTab === 'financial' && (
          <FinancialSettingsTab
            data={settings.financial}
            onChange={handleChange}
            onPaymentToggle={handlePaymentToggle}
          />
        )}

        {activeTab === 'booking' && (
          <BookingSettingsTab
            data={settings.booking}
            onChange={handleChange}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsSettingsTab
            data={settings.notifications}
            onChange={handleChange}
          />
        )}

        {activeTab === 'security' && (
          <SecuritySettingsTab
            data={settings.security}
            onChange={handleChange}
          />
        )}

        {/* Bottom Save Bar */}
        <div className="sticky bottom-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-outline-variant shadow-lg flex items-center justify-between">
          <p className="text-xs text-secondary font-medium hidden sm:block">
            * تأكد من مراجعة الحقول قبل حفظ الإعدادات لتجنب تأثيرها على الفواتير والإشعارات.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setSettings(initialSettings)}
              className="px-5 py-2.5 text-xs font-bold text-secondary hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              استعادة الافتراضي
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary hover:bg-teal-hover text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {isSaving ? 'sync' : 'save'}
              </span>
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
