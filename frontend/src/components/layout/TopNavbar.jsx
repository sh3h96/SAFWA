import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

/**
 * TopNavbar — Top header bar with search, notifications, and user profile.
 * Standalone version that does not depend on external mock data or Avatar component.
 */
export default function TopNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-outline-variant flex justify-end items-center px-8 w-full sticky top-0 z-40">
      {/* User profile section */}
      <div className="relative">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {/* Name */}
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-inverse-surface m-0 leading-none">
              {user?.name || 'مستخدم'}
            </p>
          </div>

          {/* Simple Avatar Circle */}
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'م'}
          </div>
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-50">
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
  );
}
