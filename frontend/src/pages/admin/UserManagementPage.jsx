import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import TabBar from '../../components/common/TabBar';
import StaffCard from '../../components/common/StaffCard';
import DataTable from '../../components/common/DataTable';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import ActionMenu from '../../components/ui/ActionMenu';
import Pagination from '../../components/common/Pagination';
import Avatar from '../../components/common/Avatar';
import StatusBadge from '../../components/common/StatusBadge';
import AddUserModal from '../../components/common/AddUserModal';

import { staffHighlights, usersList } from '../../mock/admin/users';

const tabs = [
  { id: 'all', label: 'جميع المستخدمين' },
  { id: 'techs', label: 'الفنيين والعمال' },
  { id: 'clients', label: 'العملاء' },
  { id: 'admins', label: 'المدراء والمشرفين' }
];

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [users, setUsers] = useState(usersList);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleToggleActive = (id, checked) => {
    setUsers(users.map(u => u.id === id ? { ...u, isActive: checked } : u));
  };

  const handleAddUser = (newUser) => {
    const roleTypeMap = {
      'مدير نظام': 'admin',
      'فني ميكانيكا': 'technician',
      'فني كهرباء': 'technician',
      'استقبال': 'reception',
      'عميل': 'vip'
    };

    const userObj = {
      id: `u_${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || '+966 50 000 0000',
      role: newUser.role,
      roleType: roleTypeMap[newUser.role] || 'admin',
      registeredAt: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      isActive: true,
      avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
      initials: newUser.name.split(' ').map(n => n[0]).join(' ').slice(0, 3)
    };

    setUsers([userObj, ...users]);
  };

  const getRoleVariant = (roleType) => {
    switch(roleType) {
      case 'admin': return 'primary';
      case 'vip': return 'info';
      case 'technician': return 'success';
      case 'reception': return 'warning';
      default: return 'primary';
    }
  };

  const filteredUsers = users.filter((user) => {
    if (activeTab === 'techs') {
      return user.roleType === 'technician' || user.role.includes('فني');
    }
    if (activeTab === 'clients') {
      return user.roleType === 'vip' || user.role.includes('عميل');
    }
    if (activeTab === 'admins') {
      return (
        user.roleType === 'admin' ||
        user.roleType === 'reception' ||
        user.role.includes('مدير') ||
        user.role.includes('استقبال')
      );
    }
    return true;
  });

  const columns = [
    {
      key: 'user',
      label: 'المستخدم',
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar src={user.avatar} name={user.name} initials={user.initials} size="md" />
          <div className="text-right">
            <p className="font-bold text-on-background">{user.name}</p>
            <p className="text-xs text-on-surface-variant">{user.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      label: 'رقم الهاتف',
      render: (user) => (
        <span className="data-mono text-sm">{user.phone}</span>
      )
    },
    {
      key: 'role',
      label: 'الدور / الصلاحية',
      render: (user) => (
        <StatusBadge variant={getRoleVariant(user.roleType)} label={user.role} />
      )
    },
    {
      key: 'registeredAt',
      label: 'تاريخ التسجيل',
      render: (user) => (
        <span className="data-mono text-sm">{user.registeredAt}</span>
      )
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (user) => (
        <ToggleSwitch 
          checked={user.isActive} 
          onChange={(checked) => handleToggleActive(user.id, checked)} 
        />
      )
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (user) => (
        <ActionMenu onClick={() => console.log('Action for', user.name)} />
      )
    }
  ];

  const tableActions = (
    <>
      <button className="p-2 border border-outline-variant rounded-lg bg-white hover:bg-surface-container transition-colors flex items-center justify-center">
        <span className="material-symbols-outlined text-on-surface-variant">filter_list</span>
      </button>
      <button className="p-2 border border-outline-variant rounded-lg bg-white hover:bg-surface-container transition-colors flex items-center justify-center">
        <span className="material-symbols-outlined text-on-surface-variant">download</span>
      </button>
    </>
  );

  const pagination = (
    <Pagination 
      total={128} 
      currentStart={1} 
      currentEnd={filteredUsers.length} 
      hasNext={true} 
      hasPrev={false} 
      onNext={() => {}} 
      onPrev={() => {}} 
    />
  );

  return (
    <>
      <PageHeader 
        title="إدارة المستخدمين والصلاحيات"
        subtitle="نظرة عامة على طاقم العمل، العملاء، وصلاحيات النظام."
        actionLabel="إضافة مستخدم جديد"
        actionIcon="person_add"
        onAction={() => setIsAddModalOpen(true)}
      />

      <TabBar 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Staff Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {staffHighlights.map(staff => (
          <StaffCard key={staff.id} staff={staff} />
        ))}
      </div>

      <DataTable 
        title="قائمة المستخدمين"
        columns={columns}
        data={filteredUsers}
        actions={tableActions}
        pagination={pagination}
      />

      <AddUserModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddUser}
      />
    </>
  );
}

