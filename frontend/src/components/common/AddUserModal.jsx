import { useState } from 'react';

/**
 * AddUserModal — Modal for adding a new user/staff member.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - onSubmit: function({ name, email, phone, role, permissions })
 */
export default function AddUserModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'مدير نظام',
    permissions: []
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionToggle = (permission) => {
    setFormData(prev => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (onSubmit) {
      onSubmit(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Modal Box */}
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300 z-10">
        {/* Header */}
        <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <h2 className="text-xl font-bold text-on-background">إضافة مستخدم جديد</h2>
          <button 
            type="button"
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-on-background">الاسم الكامل</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="border border-border-slate rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-container/20 focus:border-primary outline-none transition-all" 
                placeholder="مثال: عبد الله أحمد"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-on-background">البريد الإلكتروني</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="border border-border-slate rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-container/20 focus:border-primary outline-none transition-all text-left" 
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-on-background">رقم الهاتف</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="border border-border-slate rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-container/20 focus:border-primary outline-none transition-all text-left" 
                placeholder="+966 5X XXX XXXX"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-on-background">الدور الوظيفي</label>
              <select 
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="border border-border-slate rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-container/20 focus:border-primary outline-none transition-all"
              >
                <option value="مدير نظام">مدير نظام</option>
                <option value="فني ميكانيكا">فني ميكانيكا</option>
                <option value="فني كهرباء">فني كهرباء</option>
                <option value="استقبال">استقبال</option>
                <option value="عميل">عميل</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-bold text-on-background">الصلاحيات المخصصة</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
                {[
                  'تعديل المخزون',
                  'إصدار فواتير',
                  'حذف بيانات',
                  'إدارة العملاء',
                  'تقارير مالية'
                ].map((perm) => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer text-xs">
                    <input 
                      type="checkbox" 
                      checked={formData.permissions.includes(perm)}
                      onChange={() => handlePermissionToggle(perm)}
                      className="rounded text-primary-container focus:ring-primary-container" 
                    />
                    <span>{perm}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-outline-variant bg-surface-container-low flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 border border-outline-variant rounded-full font-bold hover:bg-surface-container transition-all"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 bg-primary-container hover:bg-teal-hover text-on-primary-container rounded-full font-bold shadow-lg transition-all active:scale-95"
            >
              حفظ المستخدم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
