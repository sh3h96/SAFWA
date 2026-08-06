import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import safwaLogo from '../../assets/images/safwa-logo.png';


export default function Sidebar({ navGroups }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login');
  };

  return (
    <aside className="fixed right-0 top-0 h-full w-64 bg-inverse-surface text-white flex flex-col border-l border-outline-variant z-50 shadow-md">
      {/* Header — Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src={safwaLogo}
            alt="SAFWA"
            className="h-12 w-auto object-contain"
            onError={(e) => {
              // Fallback: hide img and show text
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span
            className="text-xl font-bold text-white hidden"
            aria-hidden="true"
          >
            صفوة
          </span>
        </div>
      </div>

      {/* Grouped Navigation Links */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar space-y-6">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {/* Section Header */}
            <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 mt-6 px-4 select-none">
              {group.title}
            </h4>

            {/* Section Links */}
            <div className="pt-1 space-y-1">
              {group.items.map((item) => (
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
        ))}
      </nav>

      {/* Footer — Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer w-full text-slate-300 hover:text-red-400 hover:bg-red-400/10"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-medium">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
