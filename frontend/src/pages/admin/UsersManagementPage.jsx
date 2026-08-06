import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { usersAPI } from '../../services/api';
import PageLoader from '../../components/common/PageLoader';
import EditUserModal from '../../components/admin/EditUserModal';
import UserDetailsModal from '../../components/admin/UserDetailsModal';

export default function UsersManagementPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: users = [], isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: () => usersAPI.getAll(debouncedSearch),
    placeholderData: keepPreviousData
  });

  const createUserMutation = useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setName(''); setEmail(''); setPhone(''); setRole('client'); setPassword('');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id) => usersAPI.updateStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');

  const filteredUsers = activeTab === 'all' ? users : users.filter(u => u.role === activeTab);

  const getRoleLabel = (r) => {
    switch(r) {
      case 'admin': return 'إدارة';
      case 'mechanic': return 'ميكانيكي';
      case 'client': return 'عميل';
      default: return r;
    }
  };

  const getRoleColor = (r) => {
    switch(r) {
      case 'admin': return 'bg-indigo-50 text-indigo-600';
      case 'mechanic': return 'bg-amber-50 text-amber-600';
      case 'client': return 'bg-teal-50 text-teal-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createUserMutation.mutate({ name, email, phone, password, role });
  };

  if (isError) return <div className="text-center text-red-500 font-bold py-10">حدث خطأ أثناء تحميل البيانات: {error?.message}</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Row 1: Header & Primary Action */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">إدارة المستخدمين</h1>
          <p className="text-slate-500 mt-2 text-sm">إدارة الصلاحيات، الموظفين، والعملاء في النظام.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          إضافة مستخدم
        </button>
      </div>

      {/* Row 2: Toolbar & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input 
            type="text" 
            placeholder="ابحث بالاسم، الإيميل، أو الجوال..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full md:w-max overflow-x-auto">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'admin', label: 'الإدارة' },
            { id: 'mechanic', label: 'الميكانيكيون' },
            { id: 'client', label: 'العملاء' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid/List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm font-bold animate-pulse">جاري تحميل المستخدمين...</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {filteredUsers.length === 0 ? (
            <div className="col-span-full text-center py-20 text-slate-500">لا يوجد مستخدمين لعرضهم.</div>
          ) : (
            filteredUsers.map(user => (
              <div 
                key={user.id} 
                onClick={() => setSelectedUser(user)}
                className="relative bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer transition-all duration-300 flex flex-col group"
              >
                
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl ${getRoleColor(user.role)}`}>
                    {user.name.charAt(0)}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                      user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {user.status === 'active' ? 'نشط' : 'موقوف'}
                    </span>

                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === user.id ? null : user.id);
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">more_vert</span>
                      </button>
                      
                      {openMenuId === user.id && (
                        <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-[0_10px_40px_rgb(0,0,0,0.12)] border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserForEdit(user);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-right px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            تعديل البيانات
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStatusMutation.mutate(user.id);
                              setOpenMenuId(null);
                            }}
                            disabled={toggleStatusMutation.isPending}
                            className={`w-full text-right px-4 py-2.5 text-sm font-bold hover:bg-slate-50 flex items-center gap-2 ${
                              user.status === 'active' ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {user.status === 'active' ? 'block' : 'check_circle'}
                            </span>
                            {user.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg">{user.name}</h3>
                <div className="flex items-center gap-2 mt-1 mb-6">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${getRoleColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 mt-auto space-y-3 border border-slate-100/50 group-hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">mail</span>
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                    <span>{user.phone}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md">
              <h2 className="text-xl font-bold text-slate-800">إضافة مستخدم جديد</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">الاسم الكامل</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">البريد الإلكتروني</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none text-left" dir="ltr" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">رقم الجوال</label>
                <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none text-left font-mono" dir="ltr" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">كلمة المرور الافتراضية</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password123" className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none text-left font-mono" dir="ltr" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">الصلاحية (Role)</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none">
                  <option value="client">عميل</option>
                  <option value="mechanic">ميكانيكي</option>
                  <option value="admin">إداري</option>
                </select>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="submit" 
                  disabled={createUserMutation.isPending}
                  className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {selectedUserForEdit && (
        <EditUserModal 
          user={selectedUserForEdit} 
          onClose={() => setSelectedUserForEdit(null)} 
        />
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}
    </div>
  );
}
