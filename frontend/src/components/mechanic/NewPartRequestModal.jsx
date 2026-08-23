import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { newPartRequestsAPI, getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

export default function NewPartRequestModal({ appointmentId, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [partName, setPartName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const submitMutation = useMutation({
    mutationFn: (data) => newPartRequestsAPI.create(data),
    onSuccess: (res) => {
      toast.success(res.message || 'تم تقديم طلب قطعة غير موجودة بالنظام للإدارة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['assignedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['newPartRequests'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء إرسال طلب القطعة غير الموجودة'));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!partName.trim()) {
      toast.error('يرجى إدخال اسم قطعة الغيار المطلوبة');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('يرجى إدخال كمية صحيحة أكبر من صفر');
      return;
    }

    submitMutation.mutate({
      appointment_id: appointmentId,
      part_name: partName.trim(),
      quantity: qty,
      notes: notes.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">طلب قطعة غيار غير موجودة بالنظام</h3>
              <p className="text-xs text-slate-500">إرسال طلب خاص للإدارة لشراء أو توفير قطعة غيار جديدة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم قطعة الغيار المطلوبة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="مثال: طقم فحمات فرامل خلفية لكامري 2022..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الكمية المطلوبة <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3 w-36">
              <button
                type="button"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all flex items-center justify-center"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-14 p-2 text-center bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setQuantity(prev => prev + 1)}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظات ومواصفات إضافية (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أدخل رقم الموديل، النوع، أو أي ملاحظات فنية تهم الإدارة..."
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitMutation.isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">send</span>
              )}
              <span>إرسال الطلب للإدارة</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
