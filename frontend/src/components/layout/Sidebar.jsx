import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import safwaLogo from '../../assets/images/safwa-logo.png';
import safwaBrandHeader from '../../assets/images/safwa-sidebar-branding.png';
import ProfileModal from '../common/ProfileModal';

/**
 * Sidebar — Fixed right-side navigation panel.
 * Organized into categorized navigation groups with section titles.
 * Active state managed via react-router-dom NavLink.
 */
export default function Sidebar({ navGroups }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout, user } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login');
  };

  return (
    <>
      <aside className="fixed right-0 top-0 h-full w-64 bg-inverse-surface text-white flex flex-col border-l border-outline-variant z-50 shadow-md">
        {/* Header — Dedicated SAFWA SaaS Brand Area */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-center">
          <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-sm">
            <img
              src={safwaBrandHeader}
              alt="SAFWA Automotive SaaS Platform"
              className="w-full h-auto object-cover rounded-2xl filter drop-shadow-md"
              onError={(e) => {
                e.target.src = safwaLogo;
              }}
            />
          </div>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar space-y-6">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.allowedRoles && item.allowedRoles.length > 0) {
                return item.allowedRoles.includes(user?.role);
              }
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1">
                {/* Section Header */}
                <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 mt-6 px-4 select-none">
                  {group.title}
                </h4>

                {/* Section Links */}
                <div className="pt-1 space-y-1">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer w-full ${
                          isActive
                            ? 'bg-teal-700 text-white shadow-md'
                            : 'text-slate-300 hover:bg-[#1a2938] hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className="material-symbols-outlined text-xl"
                            style={{
                              fontVariationSettings: isActive
                                ? "'FILL' 1"
                                : "'FILL' 0",
                            }}
                          >
                            {item.icon}
                          </span>
                          <span className="font-medium text-sm">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer — Action Area: Settings & Logout */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer w-full text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            <span>إعدادات الحساب</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer w-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-sm font-medium"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Shared Profile Settings Modal */}
      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
    </>
  );
}
