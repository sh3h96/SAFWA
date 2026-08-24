import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersAPI, authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from './Avatar';
import ImageUploader from '../admin/ImageUploader';

export default function ProfileModal({ onClose }) {
  const { user, updateUserContext } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'

  // Fetch fresh profile from API to guarantee latest database state
  const { data: freshProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => authAPI.getMe(),
    staleTime: 0
  });

  const currentUser = freshProfile || user;

  // Profile fields initialized from authenticated user context or fresh profile query
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name !== undefined) setName(currentUser.name || '');
      if (currentUser.phone !== undefined) setPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  // Password strength logic (Shared standard)
  const getPasswordStrength = () => {
    if (!newPassword) return { label: '', color: 'bg-slate-200', level: 0 };
    if (newPassword.length < 6) {
      return { label: 'ضعيفة (قصيرة جداً)', color: 'bg-rose-500', level: 1 };
    }

    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    const charTypes = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

    if (charTypes <= 1) {
      return { label: 'ضعيفة', color: 'bg-rose-500', level: 1 };
    }
    if (newPassword.length >= 8 && charTypes >= 3) {
      return { label: 'قوية', color: 'bg-emerald-500', level: 3 };
    }
    return { label: 'متوسطة', color: 'bg-amber-500', level: 2 };
  };

  const strength = getPasswordStrength();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const updateProfileMutation = useMutation({
    mutationFn: (data) => usersAPI.updateProfile(data),
    onSuccess: (updatedUser) => {
      toast.success('تم تحديث الملف الشخصي بنجاح');
      if (updateUserContext) {
        updateUserContext(updatedUser);
      }
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => usersAPI.changePassword(data),
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    }
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({ name, phone });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin': return { label: 'سوبر أدمن', bg: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'admin': return { label: 'مدير النظام', bg: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'mechanic': return { label: 'ميكانيكي', bg: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'client': return { label: 'عميل', bg: 'bg-teal-100 text-teal-700 border-teal-200' };
      default: return { label: role || 'مستخدم', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(currentUser?.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <span className="material-symbols-outlined text-xl">manage_accounts</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">إعدادات الحساب</h2>
              <p className="text-xs text-slate-500">تحديث بياناتك الشخصية وإعدادات الأمان</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:bg-slate-100 transition-colors shadow-sm border border-slate-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* User Card Profile Header (SaaS Standard Layout) */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex items-center gap-4">
          <Avatar 
            src={currentUser?.avatar_url || currentUser?.avatar || currentUser?.image_url} 
            name={currentUser?.name} 
            initials={currentUser?.name?.charAt(0).toUpperCase() || 'م'} 
            size="lg" 
          />
          <div className="space-y-1">
            <h3 className="font-bold text-lg leading-snug">{currentUser?.name || 'مستخدم SAFWA'}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-300 font-mono">{currentUser?.email}</span>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${roleInfo.bg}`}>
                {roleInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-3 bg-slate-50/30 gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 font-bold text-xs sm:text-sm transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="material-symbols-outlined text-lg">person</span>
            البيانات الشخصية
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 font-bold text-xs sm:text-sm transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="material-symbols-outlined text-lg">lock</span>
            الأمان وكلمة المرور
          </button>
        </div>

        {/* Tab 1: Profile Information */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
            <div className="max-w-md mx-auto space-y-4">
              
              {/* Profile Image Uploader */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <ImageUploader
                  entityType="user"
                  entityId={currentUser?.id}
                  currentImageUrl={currentUser?.avatar_url || currentUser?.avatar || currentUser?.image_url}
                  label="الصورة الشخصية"
                  onImageUpdated={(newUrl) => {
                    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                    if (updateUserContext) updateUserContext({ ...currentUser, avatar_url: newUrl });
                  }}
                  onImageDeleted={() => {
                    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                    if (updateUserContext) updateUserContext({ ...currentUser, avatar_url: null });
                  }}
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">الاسم الكامل</label>
                <input 
                  required 
                  type="text"
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-600 outline-none transition-all font-medium text-slate-800" 
                />
              </div>

              {/* Phone Number — Fully editable for all users including Super Admin */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">رقم الجوال</label>
                <input 
                  type="text"
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="7XXXXXXXX" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-600 outline-none font-mono text-left transition-all text-slate-800" 
                  dir="ltr" 
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">البريد الإلكتروني</label>
                <input 
                  disabled={isSuperAdmin}
                  value={currentUser?.email || ''} 
                  className={`w-full px-4 py-2 border border-slate-200 rounded-xl text-sm text-left font-mono ${
                    isSuperAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 text-slate-800'
                  }`} 
                  dir="ltr" 
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 shadow-md shadow-teal-700/20 cursor-pointer"
                >
                  {updateProfileMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>

            </div>
          </form>
        )}

        {/* Tab 2: Security & Password Change */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5">
            <div className="max-w-md mx-auto space-y-4">
              
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">كلمة المرور الحالية</label>
                <div className="relative">
                  <input 
                    required 
                    type={showCurrentPassword ? 'text' : 'password'} 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-600 outline-none font-mono text-left transition-all text-slate-800" 
                    dir="ltr" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showCurrentPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input 
                    required 
                    type={showNewPassword ? 'text' : 'password'} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="أدخل كلمة المرور الجديدة" 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-600 outline-none font-mono text-left transition-all text-slate-800" 
                    dir="ltr" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showNewPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-slate-500">قوة كلمة المرور:</span>
                      <span className={strength.level === 3 ? 'text-emerald-600' : strength.level === 2 ? 'text-amber-600' : 'text-rose-600'}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full flex-1 transition-all duration-300 ${strength.level >= 1 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all duration-300 ${strength.level >= 2 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all duration-300 ${strength.level >= 3 ? strength.color : 'bg-transparent'}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">تأكيد كلمة المرور الجديدة</label>
                <div className="relative">
                  <input 
                    required 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-teal-600 outline-none font-mono text-left transition-all text-slate-800" 
                    dir="ltr" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                {/* Mismatch Warning */}
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    كلمتا المرور غير متطابقتين
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending || (newPassword && confirmPassword && newPassword !== confirmPassword)}
                  className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 shadow-md shadow-teal-700/20 cursor-pointer"
                >
                  {changePasswordMutation.isPending ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                </button>
              </div>

            </div>
          </form>
        )}
      </div>
    </div>
  );
}
