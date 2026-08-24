import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function PartsApproval({ appointmentId, requestedParts = [], isReadOnly = false }) {
  const queryClient = useQueryClient();
  
  // Store local decisions before submitting
  const [decisions, setDecisions] = useState({});
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => clientAPI.submitPartsApproval(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'appointments'] });
    }
  });

  const handleDecision = (id, status) => {
    if (isReadOnly) return;
    setDecisions(prev => ({ ...prev, [id]: status }));
  };

  const handleSubmit = () => {
    if (isReadOnly) return;
    const payload = Object.keys(decisions).map(id => ({
      id: parseInt(id),
      status: decisions[id]
    }));
    mutation.mutate(payload);
  };

  const pendingParts = requestedParts.filter(p => p.status === 'pending');
  const alreadyProcessed = requestedParts.filter(p => p.status !== 'pending');

  if (requestedParts.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      <div className="flex items-center gap-2 text-amber-600 mb-4">
        <span className="material-symbols-outlined">inventory_2</span>
        <h4 className="font-bold text-lg">{isReadOnly ? 'تفاصيل قطع الغيار المطلوبة' : 'بانتظار موافقة القطع'}</h4>
      </div>
      {!isReadOnly && (
        <p className="text-sm text-slate-500 mb-6">لقد طلب الفني القطع التالية لاستكمال الإصلاح. يرجى الموافقة عليها أو رفضها.</p>
      )}
      
      <div className="space-y-4">
        {pendingParts.map(part => (
          <div key={part.id} className="bg-slate-50 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="font-bold text-slate-800">{part.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                الكمية: {part.quantity} <span className="mx-2">•</span> السعر للقطعة: {formatCurrency(part.price)}
              </p>
            </div>
            
            {isReadOnly ? (
              <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-lg text-xs font-bold">بانتظار القرار</span>
            ) : (
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => handleDecision(part.id, 'approved')}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    decisions[part.id] === 'approved' 
                      ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] ml-1 align-middle">check_circle</span>
                  موافق
                </button>
                
                <button 
                  onClick={() => handleDecision(part.id, 'rejected')}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    decisions[part.id] === 'rejected' 
                      ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] ml-1 align-middle">cancel</span>
                  رفض
                </button>
              </div>
            )}
          </div>
        ))}

        {alreadyProcessed.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button 
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3 hover:text-primary transition-colors"
            >
              <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                keyboard_arrow_down
              </span>
              قطع تم اتخاذ قرار بشأنها
            </button>
            
            {isHistoryExpanded && (
              <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                {alreadyProcessed.map(part => (
                  <div key={part.id} className="flex justify-between items-center text-sm p-3 bg-white border border-slate-100 rounded-xl opacity-75">
                    <span className="font-medium flex items-center gap-2">
                      {part.name} 
                      <span className="text-slate-400 text-xs">(الكمية: {part.quantity} • {formatCurrency(part.price)} / للقطعة)</span>
                    </span>
                    {part.status === 'approved' ? (
                      <span className="text-teal-600 bg-teal-50 px-2 py-1 rounded-lg text-xs font-bold shrink-0">تمت الموافقة</span>
                    ) : (
                      <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-lg text-xs font-bold shrink-0">تم الرفض</span>
                    )}
                  </div>
                ))}
                {(() => {
                  const totalApproved = alreadyProcessed.reduce((sum, part) => {
                    if (part.status === 'approved') {
                      return sum + (part.quantity * Number(part.price || 0));
                    }
                    return sum;
                  }, 0);
                  
                  if (totalApproved > 0) {
                    return (
                      <div className="flex justify-between items-center pt-3 px-2 border-t border-slate-100 mt-2">
                        <span className="font-bold text-slate-700">إجمالي القطع المعتمدة:</span>
                        <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalApproved)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}

        {!isReadOnly && pendingParts.length > 0 && (
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSubmit}
              disabled={Object.keys(decisions).length === 0 || mutation.isPending}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_4px_25px_rgb(0,0,0,0.15)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              {mutation.isPending ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">send</span>
              )}
              تأكيد الاختيارات
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
