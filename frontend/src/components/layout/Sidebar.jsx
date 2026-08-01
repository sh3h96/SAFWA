import { NavLink, useNavigate } from 'react-router-dom';
import { sidebarNavGroups } from '../../constants/navigation';
import safwaLogo from '../../assets/images/safwa-logo.png';

/**
 * Sidebar — Fixed right-side navigation panel.
 * Organized into categorized navigation groups with section titles.
 * Active state managed via react-router-dom NavLink.
 */
export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
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
        {sidebarNavGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {/* Section Header */}
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-2 select-none border-b border-white/5">
              {group.title}
            </h4>

            {/* Section Links */}
            <div className="pt-1 space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                        : 'text-surface-variant hover:bg-white/5 hover:text-white'
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
          className="flex items-center gap-3 w-full text-surface-variant hover:text-danger-text hover:bg-white/5 px-4 py-3 rounded-lg transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-medium">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
