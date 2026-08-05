import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reviewsAPI } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';

export default function ReviewsReportsPage() {
  const { data: reviews = [], isLoading, isError } = useQuery({
    queryKey: ['reviews'],
    queryFn: reviewsAPI.getAll
  });

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1) : 0;
  
  const stats = {
    average: avgRating,
    total: totalReviews,
    fiveStarPercent: totalReviews > 0 ? (reviews.filter(r => r.rating === 5).length / totalReviews) * 100 : 0,
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <span 
        key={i} 
        className={`material-symbols-outlined text-lg ${i < rating ? 'text-amber-400' : 'text-slate-200'}`}
        style={{ fontVariationSettings: i < rating ? "'FILL' 1" : "'FILL' 0" }}
      >
        star
      </span>
    ));
  };

  if (isLoading) return <PageLoader />;
  
  if (isError) return (
    <div className="text-center py-12 text-rose-500">
      <span className="material-symbols-outlined text-4xl mb-4">error</span>
      <p>حدث خطأ أثناء تحميل البيانات</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">التقييمات والجودة</h1>
        <p className="text-slate-500 mt-2 text-sm">متابعة رضا العملاء وأداء الفنيين لضمان أعلى معايير الجودة.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Col: Stats */}
        <div className="w-full lg:w-1/3 space-y-6 shrink-0">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center flex flex-col items-center justify-center h-64">
            <h2 className="text-slate-500 font-bold text-sm mb-4">متوسط التقييم العام</h2>
            <div className="text-6xl font-bold text-slate-800 mb-4 font-mono">{stats.average}</div>
            <div className="flex gap-1 mb-2">{renderStars(Math.round(stats.average))}</div>
            <p className="text-xs text-slate-400">بناءً على {stats.total} تقييم</p>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-400">trending_up</span>
              أداء الفنيين (هذا الشهر)
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <span className="text-sm">محمد الميكانيكي</span>
                <div className="flex items-center gap-1.5"><span className="text-amber-400 text-sm material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>star</span><span className="font-mono font-bold">4.9</span></div>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <span className="text-sm">أحمد صالح</span>
                <div className="flex items-center gap-1.5"><span className="text-amber-400 text-sm material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>star</span><span className="font-mono font-bold">4.5</span></div>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <span className="text-sm">يوسف العلي</span>
                <div className="flex items-center gap-1.5"><span className="text-amber-400 text-sm material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>star</span><span className="font-mono font-bold">4.2</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Reviews List */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">أحدث آراء العملاء</h2>
            <select className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 px-4 py-2 outline-none cursor-pointer">
              <option value="all">كل التقييمات</option>
              <option value="5">5 نجوم فقط</option>
              <option value="1">1 نجمة فقط</option>
            </select>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto h-[600px] custom-scrollbar">
            {reviews.map(review => (
              <div key={review.id} className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl hover:border-slate-200 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">
                      {review.client.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{review.client}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {renderStars(review.rating)}
                  </div>
                </div>
                
                <p className="text-slate-600 text-sm leading-relaxed mb-4">"{review.comment}"</p>
                
                <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400">الفني المسؤول:</span>
                  <span className="font-bold text-slate-700">{review.mechanic}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
