import { useState } from 'react';
import SearchInput from '../../components/ui/SearchInput';
import LicensePlate from '../../components/common/LicensePlate';
import StatusBadge from '../../components/common/StatusBadge';
import ReassignBayModal from '../../components/workshop/ReassignBayModal';
import { workshopResponse } from '../../mock/admin/workshop';
import toast from 'react-hot-toast';

export default function WorkshopDispatcherPage() {
  const [unassignedVehicles, setUnassignedVehicles] = useState(workshopResponse.unassignedVehicles);
  const [bays, setBays] = useState(workshopResponse.bays);
  const [searchQuery, setSearchQuery] = useState('');

  // Reassign Modal state
  const [editingBay, setEditingBay] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedBayNumber, setSelectedBayNumber] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filter unassigned vehicles
  const filteredUnassigned = unassignedVehicles.filter(v =>
    v.makeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open Reassign Modal for existing bay or unassigned vehicle assignment
  const handleOpenModal = (bay) => {
    setEditingBay(bay);
    setSelectedTechnician(bay.technician || workshopResponse.technicians[0]);
    setSelectedBayNumber(bay.number || 1);
    setSelectedStatus(bay.badgeText || workshopResponse.serviceStatuses[0]);
  };

  // Assign an unassigned vehicle directly to an empty bay
  const handleAssignUnassigned = (vehicle) => {
    const emptyBay = bays.find(b => b.status === 'empty');
    if (!emptyBay) {
      toast.error('لا توجد منصات فارغة متوفرة حالياً');
      return;
    }

    const updatedBays = bays.map(b => {
      if (b.id === emptyBay.id) {
        return {
          ...b,
          status: 'working',
          statusText: 'المنصة تعمل بكفاءة',
          badgeText: 'جاري الإصلاح',
          badgeVariant: 'success',
          vehicleName: vehicle.makeModel,
          plateNumber: vehicle.plateNumber,
          technician: 'أحمد سالم',
          progress: 10,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNM6ljK4WzdJ6w1V28jql7BDmCKrMyQDPHEkcPiB3pyqRIkpDCDTNKaiF5A4mFydxSriZFrokJNjG1kXxrrpyXVLs8qG5j1uDe4RK7CsZu8zSSMVH6DNED_Vlr0lmTPGAAL8D4L7dNqotLFy1IryogYGiyzX6OgwfGeRcJxdcNUY8ZlWayUmHsgvpr2-Iy48z6UHahDZnTbot2WAt1QboVkxVX0tqvI_4igQYH1rsx6i0yii7beRlHZr897m1Srd_47O5Z5oOGogw'
        };
      }
      return b;
    });

    setBays(updatedBays);
    setUnassignedVehicles(unassignedVehicles.filter(v => v.id !== vehicle.id));
  };

  // Submit Reassign Modal Changes
  const handleSaveModalChanges = () => {
    if (!editingBay) return;

    setBays(bays.map(b => {
      if (b.id === editingBay.id) {
        return {
          ...b,
          technician: selectedTechnician,
          badgeText: selectedStatus,
          number: selectedBayNumber
        };
      }
      return b;
    }));

    setEditingBay(null);
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto w-full">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">توزيع منصات الخدمة</h1>
          <p className="text-sm text-on-secondary-fixed-variant mt-1">
            إدارة فورية لرافعات الورشة والفنيين
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate rounded-lg text-sm font-medium hover:bg-surface-container transition-colors text-on-surface">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            <span>تصفية</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-teal-hover transition-colors shadow-sm">
            <span className="material-symbols-outlined text-lg">grid_view</span>
            <span>تخطيط الورشة</span>
          </button>
        </div>
      </div>

      {/* Main Grid & Panel Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left/Right Sidebar: Unassigned Vehicles */}
        <aside className="lg:col-span-1 bg-white border border-slate rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-on-surface">مركبات بانتظار التوزيع</h3>
            <span className="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-xs font-bold">
              {filteredUnassigned.length}
            </span>
          </div>

          <SearchInput 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن مركبة..."
          />

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredUnassigned.map((vehicle) => (
              <div 
                key={vehicle.id} 
                className="p-4 bg-white border border-slate rounded-xl shadow-sm hover:border-primary cursor-move transition-all group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-on-background">{vehicle.makeModel}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{vehicle.yearColor}</p>
                  </div>
                  <LicensePlate plateNumber={vehicle.plateNumber} variant="compact" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate/50">
                  <span className="text-xs flex items-center gap-1 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {vehicle.waitingTime}
                  </span>
                  <button 
                    onClick={() => handleAssignUnassigned(vehicle)}
                    className="text-primary hover:underline text-xs font-bold"
                  >
                    توزيع
                  </button>
                </div>
              </div>
            ))}

            {filteredUnassigned.length === 0 && (
              <p className="text-center text-xs text-on-surface-variant py-6">
                لا توجد مركبات بانتظار التوزيع
              </p>
            )}
          </div>
        </aside>

        {/* Main Workshop Bays Grid (3 Columns on Large screens) */}
        <section className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bays.map((bay) => {
              // Render Bay Card based on status
              if (bay.status === 'empty') {
                return (
                  <div 
                    key={bay.id}
                    className="border-2 border-dashed border-slate rounded-2xl flex items-center justify-center p-10 bg-surface-container-low hover:bg-white hover:border-primary transition-all group cursor-pointer min-h-[260px]"
                  >
                    <div className="text-center">
                      <div className="w-14 h-14 bg-white border border-slate rounded-full flex items-center justify-center mx-auto mb-3 text-on-surface-variant group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-2xl">add_circle</span>
                      </div>
                      <h3 className="font-bold text-base text-on-surface mb-1">{bay.title}</h3>
                      <p className="text-xs text-on-surface-variant mb-5">{bay.statusText}</p>
                      <button 
                        onClick={() => {
                          if (unassignedVehicles.length > 0) {
                            handleAssignUnassigned(unassignedVehicles[0]);
                          } else {
                            toast.error('لا توجد مركبات بانتظار التوزيع حالياً');
                          }
                        }}
                        className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-teal-hover transition-colors shadow-sm"
                      >
                        تعيين سيارة جديدة
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={bay.id}
                  className="bg-white border border-slate rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group p-6 flex flex-col justify-between"
                >
                  {/* Action Menu */}
                  <div className="absolute top-4 left-4">
                    <button 
                      onClick={() => handleOpenModal(bay)}
                      className="p-2 bg-surface hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"
                      title="إجراءات المنصة"
                    >
                      <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>
                  </div>

                  <div>
                    {/* Bay Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                          bay.status === 'delayed' 
                            ? 'bg-warning-bg text-warning-text' 
                            : 'bg-primary-container text-on-primary-container'
                        }`}>
                          {bay.number}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-on-background">{bay.title}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              bay.status === 'delayed' ? 'bg-warning-text' : 'bg-success-text'
                            }`} />
                            <span className="text-xs text-on-surface-variant">{bay.statusText}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge 
                        variant={bay.badgeVariant || 'success'} 
                        label={bay.badgeText} 
                      />
                    </div>

                    {/* Vehicle & Tech Info */}
                    <div className="flex gap-4 mb-5">
                      <div className="w-28 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate shrink-0">
                        <img className="w-full h-full object-cover" src={bay.image} alt={bay.vehicleName} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-base text-on-background">{bay.vehicleName}</h4>
                          {bay.plateNumber && (
                            <LicensePlate plateNumber={bay.plateNumber} />
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-2">
                          <span className="material-symbols-outlined text-sm">person</span>
                          <span>الفني: {bay.technician}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Specific Footer (Progress / Ready Banner / Warning Notice) */}
                  {bay.status === 'working' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-on-background">
                        <span>نسبة الإنجاز</span>
                        <span>{bay.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary-container h-full transition-all duration-700" 
                          style={{ width: `${bay.progress}%` }} 
                        />
                      </div>
                    </div>
                  )}

                  {bay.status === 'ready' && (
                    <div className="flex items-center justify-between p-3 bg-success-bg rounded-xl">
                      <div className="flex items-center gap-2 text-success-text">
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        <span className="text-xs font-bold">{bay.completedMessage}</span>
                      </div>
                      <button className="text-primary text-xs font-bold underline hover:text-teal-hover">
                        إصدار الفاتورة
                      </button>
                    </div>
                  )}

                  {bay.status === 'delayed' && bay.warningNotice && (
                    <div className="p-3 bg-warning-bg/30 rounded-xl flex items-center gap-3">
                      <span className="material-symbols-outlined text-warning-text text-xl">inventory</span>
                      <div className="text-xs">
                        <p className="font-bold text-warning-text">{bay.warningNotice.item}</p>
                        <p className="text-on-surface-variant mt-0.5">{bay.warningNotice.eta}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Reassign Modal */}
      <ReassignBayModal 
        isOpen={!!editingBay}
        bay={editingBay}
        technicians={workshopResponse.technicians}
        statuses={workshopResponse.serviceStatuses}
        selectedTechnician={selectedTechnician}
        selectedBayNumber={selectedBayNumber}
        selectedStatus={selectedStatus}
        onClose={() => setEditingBay(null)}
        onTechnicianChange={setSelectedTechnician}
        onBayChange={setSelectedBayNumber}
        onStatusChange={setSelectedStatus}
        onSubmit={handleSaveModalChanges}
      />
    </div>
  );
}
