import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../../services/api';

export default function EditUserModal({ user, onClose }) {
  const queryClient = useQueryClient();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState(user?.role || 'client');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
      setRole(user.role);
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => usersAPI.update(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ name, email, phone, role });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-800">تعديل بيانات المستخدم</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">الاسم الكامل</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">البريد الإلكتروني</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none text-left" dir="ltr" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">رقم الجوال</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none text-left font-mono" dir="ltr" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">الصلاحية (Role)</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none">
              <option value="client">عميل</option>
              <option value="mechanic">ميكانيكي</option>
              <option value="admin">إداري</option>
            </select>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="submit" 
              disabled={updateMutation.isPending}
              className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
