import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProfileModal({ onClose }) {
  const { user, updateUserContext } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => usersAPI.updateProfile(data),
    onSuccess: (updatedUser) => {
      toast.success('تم تحديث الملف الشخصي بنجاح');
      if (updateUserContext) {
        updateUserContext(updatedUser);
      }
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
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin': return 'سوبر أدمن';
      case 'admin': return 'مدير النظام';
      case 'mechanic': return 'ميكانيكي';
      case 'client': return 'عميل';
      default: return role;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">إعدادات الحساب والملف الشخصي</h2>
            <p className="text-xs text-slate-500 mt-1">تحديث بياناتك الشخصية وأمان الحساب</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* User Card Highlights */}
        <div className="px-8 py-4 bg-slate-900 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center font-bold text-xl text-white">
            {user?.name?.charAt(0).toUpperCase() || 'م'}
          </div>
          <div>
            <h3 className="font-bold text-base">{user?.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-300">{user?.email}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-500/20 text-teal-300">
                {getRoleBadge(user?.role)}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-8 pt-4 gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            البيانات الشخصية
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'security'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            الأمان وكلمة المرور
          </button>
        </div>

        {/* Tab 1: Profile Information */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">الاسم الكامل</label>
              <input 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">رقم الجوال</label>
              <input 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder="05xxxxxxx" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none font-mono text-left transition-all" 
                dir="ltr" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">البريد الإلكتروني (غير قابل للتعديل)</label>
              <input 
                disabled 
                value={user?.email || ''} 
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm text-slate-500 text-left font-mono" 
                dir="ltr" 
              />
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                className="flex-1 bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Security & Password Change */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">كلمة المرور الحالية</label>
              <input 
                required 
                type="password" 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none font-mono text-left transition-all" 
                dir="ltr" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">كلمة المرور الجديدة</label>
              <input 
                required 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="6 أحرف على الأقل" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none font-mono text-left transition-all" 
                dir="ltr" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">تأكيد كلمة المرور الجديدة</label>
              <input 
                required 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none font-mono text-left transition-all" 
                dir="ltr" 
              />
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                type="submit" 
                disabled={changePasswordMutation.isPending}
                className="flex-1 bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {changePasswordMutation.isPending ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
