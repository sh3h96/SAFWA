/**
 * TabBar — Reusable horizontal tab navigation.
 * 
 * Props:
 * - tabs: Array of { id: string, label: string }
 * - activeTab: string (the id of active tab)
 * - onTabChange: function(id)
 */
export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-2 mb-8 border-b border-outline-variant overflow-x-auto pb-0 custom-scrollbar">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-4 border-b-2 font-bold transition-all whitespace-nowrap ${
              isActive 
                ? 'border-primary text-primary' 
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
