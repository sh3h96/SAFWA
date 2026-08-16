import { useQuery } from '@tanstack/react-query';
import { appointmentsAPI } from '../../services/api';

export default function AppointmentDetailsModal({ appointmentId, onClose }) {
  const { data: details, isLoading, isError } = useQuery({
    queryKey: ['appointmentDetails', appointmentId],
    queryFn: () => appointmentsAPI.getById(appointmentId),
    enabled: !!appointmentId
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'in_progress':
      case 'under_inspection':
        return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">قيد الفحص / الإصلاح</span>;
      case 'waiting_parts':
        return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">بانتظار القطع</span>;
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">مكتمل</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const getPartStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">قيد الانتظار</span>;
      case 'approved': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">معتمد</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">مرفوض</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
              <span className="material-symbols-outlined text-primary text-2xl">assignment</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">تفاصيل المهمة</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">رقم الموعد: {appointmentId}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : isError || !details ? (
            <div className="text-center text-red-500 font-bold py-10">حدث خطأ في تحميل التفاصيل.</div>
          ) : (
            <div className="space-y-8">
              
              {/* Section 1: General Info */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">info</span>
                    معلومات عامة
                  </h3>
                  {getStatusBadge(details.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">العميل</span>
                    <p className="text-sm font-bold text-slate-800">{details.clientName}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{details.clientPhone}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">المركبة</span>
                    <p className="text-sm font-bold text-slate-800">{details.car}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide block mb-1">الفنيون المكلفون</span>
                    {Array.isArray(details.mechanics) && details.mechanics.length > 0 ? (
                      <div className="space-y-1.5 mt-1">
                        {details.mechanics.map((m) => (
                          <div key={m.id} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                              {m.name?.charAt(0) || 'م'}
                            </div>
                            <p className="text-sm font-bold text-indigo-800">{m.name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                          {details.mechanicName?.charAt(0) || 'م'}
                        </div>
                        <p className="text-sm font-bold text-indigo-800">{details.mechanicName || 'غير محدد'}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-2">شكوى العميل الأساسية</span>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{details.issue}</p>
                </div>
              </div>

              {/* Section 2: Technical Report */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">plumbing</span>
                  تقرير الفحص الفني
                </h3>
                
                {!details.report ? (
                  <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <span className="material-symbols-outlined text-3xl mb-2">pending_actions</span>
                    <p className="text-sm font-bold">لم يتم رفع التقرير الفني بعد</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Col */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="material-symbols-outlined text-slate-400">speed</span>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">قراءة العداد (كم)</span>
                          <span className="text-sm font-bold text-slate-800">{details.report.odometer || 'غير متوفر'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">أكواد الفحص بالكمبيوتر (OBD2)</span>
                        {details.report.obd2_codes ? (
                          <div className="flex flex-wrap gap-2">
                            {details.report.obd2_codes.split(',').map((code, idx) => (
                              <span key={idx} className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-md text-xs font-mono font-bold">
                                {code.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">لا توجد أكواد</p>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">ملاحظات الفحص البصري</span>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                          {details.report.visual_inspection_notes || 'لا توجد ملاحظات إضافية'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Right Col */}
                    <div>
                      <span className="text-[10px] text-primary font-bold uppercase block mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">build_circle</span>
                        خطة العمل والإصلاح
                      </span>
                      <div className="h-full min-h-[150px] bg-primary/5 p-4 rounded-xl border border-primary/10">
                        <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                          {details.report.repair_plan || 'لم يتم تحديد خطة إصلاح'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Spare Parts */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">inventory_2</span>
                    القطع المطلوبة للصيانة
                  </h3>
                  <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                    الإجمالي: {details.requestedParts?.length || 0}
                  </div>
                </div>

                {!details.requestedParts || details.requestedParts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <span className="material-symbols-outlined text-3xl mb-2">inventory</span>
                    <p className="text-sm font-bold">لم يطلب الفني أي قطع غيار لهذه المهمة</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-4 py-3 rounded-tr-xl rounded-br-xl">القطعة</th>
                          <th className="px-4 py-3">الكمية</th>
                          <th className="px-4 py-3">سعر الوحدة</th>
                          <th className="px-4 py-3 rounded-tl-xl rounded-bl-xl">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {details.requestedParts.map(part => (
                          <tr key={part.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-700">{part.name}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{part.quantity}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{part.price} ر.س</td>
                            <td className="px-4 py-3">{getPartStatusBadge(part.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
