import { currentUser } from '../../mock/auth/user';

/**
 * TopNavbar — Top header bar with search, notifications, and user profile.
 * User data comes from mock; avatar shows initials when image is unavailable.
 */
export default function TopNavbar() {
  const user = currentUser;

  return (
    <header className="h-16 bg-white border-b border-outline-variant flex flex-row-reverse justify-between items-center px-8 w-full sticky top-0 z-40">
      {/* Left side (visually): User menu + notifications */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          className="w-10 h-10 flex items-center justify-center text-secondary hover:bg-surface rounded-full"
          aria-label="الإشعارات"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>

        {/* Help */}
        <button
          className="w-10 h-10 flex items-center justify-center text-secondary hover:bg-surface rounded-full"
          aria-label="المساعدة"
        >
          <span className="material-symbols-outlined">help</span>
        </button>

        {/* User profile */}
        <div className="flex items-center gap-3 mr-2">
          {/* Name & role */}
          <div className="text-left leading-tight hidden md:block">
            <p className="text-sm font-bold text-inverse-surface">
              {user.name}
            </p>
            <p className="text-[11px] text-secondary">{user.role}</p>
          </div>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-slate-200 border border-outline-variant overflow-hidden flex items-center justify-center">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-inverse-surface">
                {user.initials}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side (visually): Search bar */}
      <div className="flex-1 max-w-md relative">
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-sm">
          search
        </span>
        <input
          className="w-full bg-surface border-outline-variant rounded-lg pr-10 text-sm focus:ring-primary focus:border-primary"
          placeholder="البحث عن رقم اللوحة، الفاتورة أو العميل..."
          type="text"
          aria-label="البحث"
        />
      </div>
    </header>
  );
}
