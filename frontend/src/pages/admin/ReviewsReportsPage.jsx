import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reviewsAPI } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import UserDetailsModal from '../../components/admin/UserDetailsModal';
import VehicleDetailsModal from '../../components/admin/VehicleDetailsModal';
import { formatDateLong } from '../../utils/formatters';

export default function ReviewsReportsPage() {
  const [filterRating, setFilterRating] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showRatingBreakdown, setShowRatingBreakdown] = useState(false);
  const [selectedMechPerformance, setSelectedMechPerformance] = useState(null);

  const { data: reviews = [], isLoading, isError } = useQuery({
    queryKey: ['reviews'],
    queryFn: reviewsAPI.getAll
  });

  const totalReviews = reviews.length;
  const totalStarsSum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
  const avgRating = totalReviews > 0 ? (totalStarsSum / totalReviews).toFixed(1) : '0.0';

  // Compute breakdown per star rating (5, 4, 3, 2, 1)
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (starCounts[r.rating] !== undefined) {
      starCounts[r.rating] += 1;
    }
  });

  const stats = {
    average: avgRating,
    total: totalReviews,
    sum: totalStarsSum,
    starCounts
  };

  // Compute real mechanic performance dynamically from real DB reviews
  const mechPerformanceMap = {};
  reviews.forEach(r => {
    const mechName = r.mechanic || 'غير محدد';
    const mechId = r.mechanic_id;
    const key = mechId ? `id_${mechId}` : mechName;

    if (!mechPerformanceMap[key]) {
      mechPerformanceMap[key] = {
        id: mechId,
        name: mechName,
        count: 0,
        sum: 0,
        starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: []
      };
    }
    mechPerformanceMap[key].count += 1;
    mechPerformanceMap[key].sum += r.rating;
    if (mechPerformanceMap[key].starCounts[r.rating] !== undefined) {
      mechPerformanceMap[key].starCounts[r.rating] += 1;
    }
    mechPerformanceMap[key].reviews.push(r);
  });

  const mechanicPerformance = Object.values(mechPerformanceMap)
    .map(m => ({
      ...m,
      avg: (m.sum / m.count).toFixed(1)
    }))
    .sort((a, b) => b.avg - a.avg);

  const filteredReviews = reviews.filter(r => {
    if (filterRating === 'all') return true;
    return r.rating === Number(filterRating);
  });

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
      <p>حدث خطأ أثناء تحميل بيانات التقييمات والجودة</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">التقييمات والجودة</h1>
        <p className="text-slate-500 mt-2 text-sm">متابعة رضا العملاء وأداء الفنيين وتحليل تقييمات المواعيد لضمان أعلى معايير الجودة.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Stats & Mechanic Performance */}
        <div className="w-full lg:w-1/3 space-y-6 shrink-0">
          
          {/* Interactive Average Rating Card */}
          <div 
            onClick={() => setShowRatingBreakdown(true)}
            className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center flex flex-col items-center justify-center relative cursor-pointer hover:border-teal-200 hover:shadow-lg transition-all group"
            title="انقر لعرض معادلة الحساب وتوزيع النجوم"
          >
            <div className="absolute top-4 left-4 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 group-hover:bg-teal-100 transition-colors">
              <span className="material-symbols-outlined text-[14px]">analytics</span>
              تفاصيل الحساب
            </div>

            <h2 className="text-slate-500 font-bold text-sm mb-3">متوسط التقييم العام</h2>
            <div className="text-6xl font-bold text-slate-800 mb-3 font-mono group-hover:scale-105 transition-transform">{stats.average}</div>
            <div className="flex gap-1 mb-2">{renderStars(Math.round(Number(stats.average)))}</div>
            <p className="text-xs text-slate-500 font-medium">بناءً على <span className="font-bold text-slate-800 font-mono">{stats.total}</span> تقييم في النظام</p>
            <span className="text-[11px] text-teal-700 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              عرض توزيع النجوم والمعادلة
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </span>
          </div>

          {/* Interactive Technician Performance List */}
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2 text-base">
                <span className="material-symbols-outlined text-teal-400">trending_up</span>
                أداء الفنيين
              </h3>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full font-mono">
                {mechanicPerformance.length} فني
              </span>
            </div>

            <div className="space-y-3">
              {mechanicPerformance.length > 0 ? (
                mechanicPerformance.map((mech, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl flex items-center justify-between transition-all group"
                  >
                    {/* Interactive Mechanic Name */}
                    <div 
                      onClick={() => mech.id && setSelectedUserId(mech.id)}
                      className="flex items-center gap-2 cursor-pointer hover:text-teal-300 transition-colors"
                      title="عرض الملف الشخصي للفني"
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-900/60 text-teal-300 flex items-center justify-center font-bold text-xs border border-teal-700/50">
                        {mech.name?.charAt(0) || 'م'}
                      </div>
                      <div>
                        <span className="text-sm font-bold block flex items-center gap-1">
                          {mech.name}
                          {mech.id && (
                            <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 text-teal-400 transition-opacity">open_in_new</span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">{mech.count} تقييمات</span>
                      </div>
                    </div>

                    {/* Interactive Rating & Performance Trigger */}
                    <div 
                      onClick={() => setSelectedMechPerformance(mech)}
                      className="flex items-center gap-2 cursor-pointer bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-700 hover:border-amber-400/50 transition-all"
                      title="عرض تفاصيل تقييمات وتوزيع نجوم الفني"
                    >
                      <span className="text-amber-400 text-sm material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
                      <span className="font-mono font-bold text-sm">{mech.avg}</span>
                      <span className="material-symbols-outlined text-xs text-slate-400">info</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">لا توجد تقييمات للفنيين حالياً</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Reviews List */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/40">
            <div>
              <h2 className="text-lg font-bold text-slate-800">أحدث آراء العملاء</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">عدد التقييمات المعروضة: {filteredReviews.length}</p>
            </div>
            
            <select 
              value={filterRating} 
              onChange={(e) => setFilterRating(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-4 py-2.5 outline-none cursor-pointer hover:border-teal-300 transition-colors shadow-sm"
            >
              <option value="all">كل التقييمات ({reviews.length})</option>
              <option value="5">5 نجوم فقط ({starCounts[5]})</option>
              <option value="4">4 نجوم فقط ({starCounts[4]})</option>
              <option value="3">3 نجوم فقط ({starCounts[3]})</option>
              <option value="2">2 نجوم فقط ({starCounts[2]})</option>
              <option value="1">1 نجمة فقط ({starCounts[1]})</option>
            </select>
          </div>
          
          <div className="p-6 md:p-8 space-y-4 overflow-y-auto max-h-[650px] custom-scrollbar">
            {filteredReviews.length > 0 ? (
              filteredReviews.map(review => (
                <div 
                  key={review.id} 
                  className="bg-slate-50/50 border border-slate-100 p-6 rounded-2xl hover:border-teal-100 hover:bg-slate-50/80 transition-all space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    
                    {/* Interactive Customer Header */}
                    <div 
                      onClick={() => review.client_id && setSelectedUserId(review.client_id)}
                      className="flex items-center gap-3 cursor-pointer group p-1 -m-1 rounded-xl hover:bg-white transition-all"
                      title="عرض الملف الشخصي للعميل"
                    >
                      <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base border border-teal-100/60 group-hover:scale-105 transition-transform">
                        {review.client ? review.client.charAt(0) : '?'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-teal-700 flex items-center gap-1 transition-colors">
                          {review.client}
                          {review.client_id && (
                            <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity">open_in_new</span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDateLong(review.date)}</p>
                      </div>
                    </div>

                    {/* Stars & Details Trigger */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                      <button 
                        onClick={() => setSelectedReview(review)}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 mt-1 hover:underline"
                      >
                        تفاصيل التقييم
                        <span className="material-symbols-outlined text-xs">info</span>
                      </button>
                    </div>
                  </div>
                  
                  {review.comment ? (
                    <p className="text-slate-700 text-sm leading-relaxed bg-white p-3.5 rounded-xl border border-slate-100 italic">
                      "{review.comment}"
                    </p>
                  ) : (
                    <p className="text-slate-400 text-xs italic">لا يوجد تعليق مكتوب مع هذا التقييم</p>
                  )}
                  
                  {/* Interactive Entity Tags Footer */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100/80">
                    {/* Interactive Mechanic Tag */}
                    <div 
                      onClick={() => review.mechanic_id && setSelectedUserId(review.mechanic_id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                        review.mechanic_id ? 'bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/50 cursor-pointer group' : 'bg-slate-100 border-slate-100 text-slate-500'
                      }`}
                      title={review.mechanic_id ? 'عرض ملف الفني المسؤول' : ''}
                    >
                      <span className="text-slate-400 text-[13px]">الفني المسؤول:</span>
                      <span className="font-bold text-slate-700 group-hover:text-teal-800 flex items-center gap-1">
                        {review.mechanic}
                        {review.mechanic_id && (
                          <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity text-teal-600">open_in_new</span>
                        )}
                      </span>
                    </div>

                    {/* Interactive Vehicle Tag */}
                    {review.vehicle && (
                      <div 
                        onClick={() => review.vehicle_id && setSelectedVehicleId(review.vehicle_id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                          review.vehicle_id ? 'bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/50 cursor-pointer group' : 'bg-slate-100 border-slate-100 text-slate-500'
                        }`}
                        title={review.vehicle_id ? 'عرض تفاصيل المركبة' : ''}
                      >
                        <span className="material-symbols-outlined text-slate-400 text-[15px]">directions_car</span>
                        <span className="font-bold text-slate-700 group-hover:text-teal-800 flex items-center gap-1">
                          {review.vehicle} {review.vehiclePlate ? `(${review.vehiclePlate})` : ''}
                          {review.vehicle_id && (
                            <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity text-teal-600">open_in_new</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-400 space-y-2 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                <span className="material-symbols-outlined text-5xl text-slate-300">rate_review</span>
                <p className="text-sm font-bold text-slate-600">لا توجد تقييمات مطابقة لتصفية النجوم المحددة</p>
                <p className="text-xs text-slate-400">اختر "كل التقييمات" لعرض كافة سجلات آراء العملاء في النظام</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. AVERAGE RATING BREAKDOWN MODAL                   */}
      {/* ---------------------------------------------------- */}
      {showRatingBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRatingBreakdown(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                  <span className="material-symbols-outlined text-xl">analytics</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">تفاصيل متوسط التقييم العام</h3>
                  <p className="text-xs text-slate-500">طريقة الحساب وتوزيع التقييمات الحقيقية</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRatingBreakdown(false)}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Formula & Key Stats Banner */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                  <span className="text-xs text-slate-400 font-bold">معادلة حساب المتوسط</span>
                </div>

                <div className="text-center py-2 space-y-2">
                  <p className="text-xs text-slate-300">
                    متوسط التقييم العام = <span className="text-teal-400 font-bold">مجموع قيم النجوم</span> ÷ <span className="text-teal-400 font-bold">إجمالي عدد التقييمات</span>
                  </p>
                  <div className="font-mono text-lg text-teal-300 font-bold bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 dir-ltr inline-block">
                    {stats.sum} ÷ {stats.total} = {stats.average} ★
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">إجمالي التقييمات</span>
                    <span className="text-base font-bold font-mono text-white">{stats.total}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">مجموع النجوم</span>
                    <span className="text-base font-bold font-mono text-amber-400">{stats.sum}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">المتوسط النهائي</span>
                    <span className="text-base font-bold font-mono text-teal-400">{stats.average} / 5</span>
                  </div>
                </div>
              </div>

              {/* Star Rating Distribution Progress Bars */}
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
                  توزيع النجوم حسب آراء العملاء
                </h4>

                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats.starCounts[star] || 0;
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 w-16 text-slate-700 font-bold shrink-0">
                        <span>{star}</span>
                        <span className="material-symbols-outlined text-amber-400 text-sm" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
                      </div>
                      
                      <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                      
                      <div className="w-20 text-left shrink-0 font-mono text-slate-600 font-bold">
                        {count} ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. TECHNICIAN PERFORMANCE MODAL                      */}
      {/* ---------------------------------------------------- */}
      {selectedMechPerformance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedMechPerformance(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-100 text-lg">
                  {selectedMechPerformance.name?.charAt(0) || 'م'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{selectedMechPerformance.name}</h3>
                  <p className="text-xs text-slate-500">تفاصيل تقييمات الجودة وأداء الفني</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMechPerformance(null)}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Summary Header */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">متوسط تقييم الفني</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-bold font-mono text-amber-400">{selectedMechPerformance.avg}</span>
                    <div className="flex">{renderStars(Math.round(Number(selectedMechPerformance.avg)))}</div>
                  </div>
                </div>
                <div className="text-left border-r border-slate-700 pr-4">
                  <span className="text-xs text-slate-400 block font-bold">عدد التقييمات المسندة</span>
                  <span className="text-2xl font-bold font-mono text-white">{selectedMechPerformance.count}</span>
                </div>
              </div>

              {/* Formula Explanation */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">معادلة متوسط الفني:</span>
                <p className="font-mono text-slate-700 dir-ltr text-center py-1">
                  {selectedMechPerformance.sum} ÷ {selectedMechPerformance.count} = {selectedMechPerformance.avg} ★
                </p>
              </div>

              {/* Star breakdown for this mechanic */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1.5">
                  توزيع نجوم تقييمات الفني
                </h4>

                {[5, 4, 3, 2, 1].map(star => {
                  const count = selectedMechPerformance.starCounts[star] || 0;
                  const pct = selectedMechPerformance.count > 0 ? Math.round((count / selectedMechPerformance.count) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 w-14 text-slate-700 font-bold shrink-0">
                        <span>{star}</span>
                        <span className="material-symbols-outlined text-amber-400 text-sm" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
                      </div>
                      
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                      
                      <div className="w-16 text-left shrink-0 font-mono text-slate-600 font-bold">
                        {count} ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Profile Link */}
              {selectedMechPerformance.id && (
                <button
                  onClick={() => {
                    const mechId = selectedMechPerformance.id;
                    setSelectedMechPerformance(null);
                    setSelectedUserId(mechId);
                  }}
                  className="w-full py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">badge</span>
                  عرض الملف الكامل للفني بالسجل والمهام
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. REVIEW DETAILS MODAL                              */}
      {/* ---------------------------------------------------- */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedReview(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-100">
                  <span className="material-symbols-outlined text-xl">rate_review</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">تفاصيل التقييم الكاملة</h3>
                  <p className="text-xs text-slate-500">رقم التقييم: #{selectedReview.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReview(null)}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Rating Banner */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold block mb-1">التقييم الممنوح</span>
                  <div className="flex gap-1">{renderStars(selectedReview.rating)}</div>
                </div>
                <div className="text-left font-mono font-bold text-slate-800 text-lg">
                  {selectedReview.rating} / 5
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">التعليق المكتوب:</span>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                  {selectedReview.comment ? `"${selectedReview.comment}"` : 'لا يوجد تعليق مكتوب مع هذا التقييم.'}
                </div>
              </div>

              {/* Linked Entities Grid */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">الجهات والكيانات المرتبطة:</span>

                {/* Customer */}
                <div 
                  onClick={() => {
                    const cId = selectedReview.client_id;
                    setSelectedReview(null);
                    if (cId) setSelectedUserId(cId);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    selectedReview.client_id ? 'bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/40 cursor-pointer group' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-600">person</span>
                    <div>
                      <span className="text-xs text-slate-400 block font-bold">العميل</span>
                      <span className="text-sm font-bold text-slate-800 group-hover:text-teal-800">{selectedReview.client}</span>
                    </div>
                  </div>
                  {selectedReview.client_id && (
                    <span className="text-xs font-bold text-teal-700 group-hover:underline flex items-center gap-1">
                      عرض الملف
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </span>
                  )}
                </div>

                {/* Mechanic */}
                <div 
                  onClick={() => {
                    const mId = selectedReview.mechanic_id;
                    setSelectedReview(null);
                    if (mId) setSelectedUserId(mId);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    selectedReview.mechanic_id ? 'bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/40 cursor-pointer group' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-600">engineering</span>
                    <div>
                      <span className="text-xs text-slate-400 block font-bold">الفني المسؤول</span>
                      <span className="text-sm font-bold text-slate-800 group-hover:text-teal-800">{selectedReview.mechanic}</span>
                    </div>
                  </div>
                  {selectedReview.mechanic_id && (
                    <span className="text-xs font-bold text-teal-700 group-hover:underline flex items-center gap-1">
                      عرض الملف
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </span>
                  )}
                </div>

                {/* Vehicle */}
                {selectedReview.vehicle && (
                  <div 
                    onClick={() => {
                      const vId = selectedReview.vehicle_id;
                      setSelectedReview(null);
                      if (vId) setSelectedVehicleId(vId);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      selectedReview.vehicle_id ? 'bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/40 cursor-pointer group' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-600">directions_car</span>
                      <div>
                        <span className="text-xs text-slate-400 block font-bold">المركبة المعالجة</span>
                        <span className="text-sm font-bold text-slate-800 group-hover:text-teal-800">
                          {selectedReview.vehicle} {selectedReview.vehiclePlate ? `(${selectedReview.vehiclePlate})` : ''}
                        </span>
                      </div>
                    </div>
                    {selectedReview.vehicle_id && (
                      <span className="text-xs font-bold text-teal-700 group-hover:underline flex items-center gap-1">
                        عرض المركبة
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. REUSED USER DETAILS MODAL                         */}
      {/* ---------------------------------------------------- */}
      {selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. REUSED VEHICLE DETAILS MODAL                      */}
      {/* ---------------------------------------------------- */}
      {selectedVehicleId && (
        <VehicleDetailsModal
          vehicleId={selectedVehicleId}
          onClose={() => setSelectedVehicleId(null)}
        />
      )}

    </div>
  );
}
