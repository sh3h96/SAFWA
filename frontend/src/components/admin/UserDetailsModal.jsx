export default function UserDetailsModal({ user, onClose }) {
  if (!user) return null;

  const getRoleLabel = (r) => {
    switch (r) {
      case 'admin': return 'إدارة';
      case 'mechanic': return 'ميكانيكي';
      case 'client': return 'عميل';
      default: return r;
    }
  };

  const getRoleColor = (r) => {
    switch (r) {
      case 'admin': return 'bg-indigo-50 text-indigo-600';
      case 'mechanic': return 'bg-amber-50 text-amber-600';
      case 'client': return 'bg-teal-50 text-teal-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 custom-scrollbar">
        
        {/* Header Section */}
        <div className="px-8 py-10 bg-slate-50/50 border-b border-slate-100 flex flex-col items-center text-center">
          <button 
            onClick={onClose} 
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
          
          <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center font-bold text-4xl mb-4 ${getRoleColor(user.role)}`}>
            {user.name.charAt(0)}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{user.name}</h2>
          
          <div className="flex items-center gap-2 mt-3">
            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${getRoleColor(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>
            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider ${
              user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {user.status === 'active' ? 'نشط' : 'موقوف'}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 space-y-8">
          
          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">معلومات التواصل</h3>
            <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100/50">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-0.5">البريد الإلكتروني</div>
                  <div className="font-medium text-slate-700">{user.email}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400">
                  <span className="material-symbols-outlined text-[18px]">call</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-0.5">رقم الجوال</div>
                  <div className="font-mono font-medium text-slate-700">{user.phone}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-0.5">تاريخ الانضمام</div>
                  <div className="font-medium text-slate-700">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Role-Based Section */}
          {user.role === 'client' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">سجل العميل (تجريبي)</h3>
              
              <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-800">المركبات المسجلة</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold">2 مركبة</span>
                </div>
                <div className="text-sm text-emerald-700 space-y-2">
                  <div className="flex items-center gap-2 bg-white/60 p-2 rounded-xl">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">directions_car</span>
                    <span>Lexus ES350 - 2024</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 p-2 rounded-xl">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">directions_car</span>
                    <span>Toyota Camry - 2020</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-700">آخر المواعيد</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>موعد صيانة دورية - قيد الانتظار (غداً 10:00 ص)</span>
                </div>
              </div>
            </div>
          )}

          {user.role === 'mechanic' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">إحصائيات الموظف (تجريبي)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50 text-center">
                  <div className="text-3xl font-bold text-indigo-600 mb-1">12</div>
                  <div className="text-xs font-bold text-indigo-800">المهام الحالية</div>
                </div>
                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50 text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">184</div>
                  <div className="text-xs font-bold text-emerald-800">المهام المنجزة</div>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-700">التقييم العام</span>
                  <div className="flex items-center gap-1 text-amber-500">
                    <span className="font-bold">4.8</span>
                    <span className="material-symbols-outlined text-[16px]">star</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '96%' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
