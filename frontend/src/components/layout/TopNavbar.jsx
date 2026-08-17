import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import ProfileModal from '../common/ProfileModal';

/**
 * TopNavbar — Top header bar with search, notifications, user profile, and profile settings modal.
 */
export default function TopNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login');
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-outline-variant flex justify-end items-center px-8 w-full sticky top-0 z-40">
        {/* User profile section */}
        <div className="relative">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {/* Name & Role */}
            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-inverse-surface m-0 leading-none">
                {user?.name || 'مستخدم'}
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 inline-block bg-slate-100 text-slate-600">
                {user?.role === 'super_admin' ? 'سوبر أدمن' : user?.role === 'admin' ? 'مدير النظام' : user?.role === 'mechanic' ? 'ميكانيكي' : 'عميل'}
              </span>
            </div>

            {/* Simple Avatar Circle */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
              user?.role === 'super_admin' ? 'bg-purple-700' : 'bg-teal-700'
            }`}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'م'}
            </div>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full text-right px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-2 transition-colors cursor-pointer border-b border-slate-50"
              >
                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                إعدادات الحساب والبروفايل
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-right px-4 py-3 text-sm text-rose-500 hover:bg-rose-50 font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Profile Settings Modal */}
      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
    </>
  );
}
