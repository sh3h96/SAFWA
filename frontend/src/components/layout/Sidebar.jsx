import { useState } from 'react';
import { sidebarNavItems } from '../../constants/navigation';
import safwaLogo from '../../assets/images/safwa-logo.png';

/**
 * Sidebar — Fixed right-side navigation panel.
 * Data-driven from navigation constants.
 * Active state managed via local state.
 */
export default function Sidebar() {
  const [activeId, setActiveId] = useState('dashboard');

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

      {/* Navigation Links */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        {sidebarNavItems.map((item) => {
          const isActive = item.id === activeId;
          return (
            <a
              key={item.id}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveId(item.id);
              }}
              className={`flex items-center gap-3 mx-2 px-4 py-3 mb-1 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-surface-variant hover:bg-white/5 hover:text-white'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontVariationSettings: isActive
                    ? "'FILL' 1"
                    : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer — Logout */}
      <div className="p-4 border-t border-white/10">
        <button className="flex items-center gap-3 w-full text-surface-variant hover:text-danger-text px-4 py-3 rounded-lg transition-colors">
          <span className="material-symbols-outlined">logout</span>
          <span className="font-medium">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
