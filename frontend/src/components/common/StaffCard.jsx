/**
 * StaffCard — Reusable card for displaying staff member info and stats.
 * 
 * Props:
 * - staff: { 
 *     id, name, role, avatar, rating, activeVehicles, repairsThisMonth, roleClass 
 *   }
 */
export default function StaffCard({ staff }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-border-slate shadow-sm flex flex-col gap-4 group hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-container/20 shrink-0">
          <img 
            className="w-full h-full object-cover" 
            alt={staff.name} 
            src={staff.avatar} 
          />
        </div>
        <div>
          <h4 className="font-bold text-lg text-on-background">{staff.name}</h4>
          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block mt-1 ${staff.roleClass}`}>
            {staff.role}
          </span>
        </div>
        <div className="mr-auto">
          <span className="text-warning-text flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="data-mono">{staff.rating}</span>
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/30">
        <div className="bg-surface-container-low p-3 rounded-lg text-center">
          <p className="text-xs text-on-surface-variant mb-1">المركبات النشطة</p>
          <p className="data-mono text-xl font-bold text-primary">{staff.activeVehicles}</p>
        </div>
        <div className="bg-surface-container-low p-3 rounded-lg text-center">
          <p className="text-xs text-on-surface-variant mb-1">إصلاحات الشهر</p>
          <p className="data-mono text-xl font-bold text-primary">{staff.repairsThisMonth}</p>
        </div>
      </div>
    </div>
  );
}
