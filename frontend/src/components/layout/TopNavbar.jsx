import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import ProfileModal from '../common/ProfileModal';

// Route context mapping dictionary for clean header breadcrumb
const routeContextMap = {
  '/admin/appointments': { parent: 'الإدارة والتشغيل', title: 'التحكم بالمواعيد' },
  '/admin/reviews': { parent: 'الإدارة والتشغيل', title: 'مراقبة الجودة' },
  '/admin/vehicles': { parent: 'الإدارة والتشغيل', title: 'إدارة المركبات' },
  '/admin/inventory': { parent: 'الإدارة والتشغيل', title: 'إدارة المخزون' },
  '/admin/financials': { parent: 'المالية والنظام', title: 'الإدارة المالية' },
  '/admin/users': { parent: 'المالية والنظام', title: 'إدارة المستخدمين' },
  '/admin/audit-logs': { parent: 'المالية والنظام', title: 'سجل التدقيق' },
  '/client/vehicles': { parent: 'مركباتي ومواعيدي', title: 'إدارة المركبات' },
  '/client/appointments': { parent: 'مركباتي ومواعيدي', title: 'سجل المواعيد' },
  '/client/booking': { parent: 'مركباتي ومواعيدي', title: 'حجز موعد' },
  '/client/billing': { parent: 'الفواتير والتقييم', title: 'الفواتير والمدفوعات' },
  '/client/reviews': { parent: 'الفواتير والتقييم', title: 'التقييمات' },
  '/mechanic/tasks': { parent: 'جدول العمل والقطع', title: 'السيارات المخصصة' },
  '/mechanic/parts-requests': { parent: 'جدول العمل والقطع', title: 'طلبات قطع الغيار' },
};

/**
 * TopNavbar — Top header bar with current route context, user profile, role indicator, click-away account dropdown, and settings modal.
 */
export default function TopNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Derive current page context
  const currentContext = routeContextMap[location.pathname] || { parent: 'نظام صفوة', title: 'لوحة التحكم' };

  // Click-away / Outside-click listener to automatically close user dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin': return 'سوبر أدمن';
      case 'admin': return 'مدير النظام';
      case 'mechanic': return 'ميكانيكي';
      case 'client': return 'عميل';
      default: return 'مستخدم';
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-outline-variant flex justify-between items-center px-6 sm:px-8 w-full sticky top-0 z-40">
        
        {/* Context / Breadcrumb Area (RTL Right side) */}
        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-sm">dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">
              {currentContext.parent}
            </span>
            <span className="hidden sm:inline-block text-slate-300 text-xs">/</span>
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              {currentContext.title}
            </span>
          </div>
        </div>

        {/* User profile dropdown container with click-away ref (RTL Left side) */}
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors select-none"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            {/* Name & Role */}
            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-inverse-surface m-0 leading-none">
                {user?.name || 'مستخدم'}
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 inline-block bg-slate-100 text-slate-600">
                {getRoleBadge(user?.role)}
              </span>
            </div>

            {/* Simple Avatar Circle */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
              user?.role === 'super_admin' ? 'bg-purple-700' : 'bg-teal-700'
            }`}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'م'}
            </div>

            {/* Dropdown Arrow Indicator */}
            <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}>
              expand_more
            </span>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Account summary header inside dropdown */}
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</p>
              </div>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full text-right px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-teal-600">manage_accounts</span>
                إعدادات الحساب والبروفايل
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={handleLogout}
                className="w-full text-right px-4 py-2.5 text-xs text-rose-500 hover:bg-rose-50 font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-rose-500">logout</span>
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Shared Profile Settings Modal */}
      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
    </>
  );
}
