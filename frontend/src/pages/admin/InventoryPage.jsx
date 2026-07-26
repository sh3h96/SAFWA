import { useState } from 'react';
import DataTable from '../../components/common/DataTable';
import AlertBanner from '../../components/common/AlertBanner';
import StockProgress from '../../components/common/StockProgress';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/ui/SearchInput';
import SelectInput from '../../components/ui/SelectInput';
import StockAdjustmentModal from '../../components/inventory/StockAdjustmentModal';
import AddPartModal from '../../components/inventory/AddPartModal';

import { inventoryResponse } from '../../mock/admin/inventory';
import { formatCurrency } from '../../utils/formatters';

export default function InventoryPage() {
  const [items, setItems] = useState(inventoryResponse.items);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('الكل');

  // Stock Adjustment Modal state
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  // Add Part Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartForm, setNewPartForm] = useState({
    name: '',
    sku: '',
    category: 'فلاتر',
    manufacturer: 'Toyota',
    stock: 0,
    maxStock: 50,
    purchasePrice: 0,
    salePrice: 0,
    supplier: ''
  });

  // Filter items by search query & manufacturer
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesManufacturer = 
      selectedManufacturer === 'الكل' || item.manufacturer === selectedManufacturer;

    return matchesSearch && matchesManufacturer;
  });

  // Open adjustment modal
  const handleOpenAdjustment = (item) => {
    setAdjustingItem(item);
    setAdjustQty(item.stock);
    setAdjustReason('');
  };

  // Submit stock adjustment
  const handleSaveAdjustment = () => {
    if (!adjustingItem) return;
    setItems(items.map(it => {
      if (it.id === adjustingItem.id) {
        const newStock = adjustQty;
        const newStatus = newStock <= 10 ? 'low' : newStock <= 25 ? 'medium' : 'good';
        return { ...it, stock: newStock, status: newStatus };
      }
      return it;
    }));
    setAdjustingItem(null);
  };

  // Delete item handler
  const handleDeleteItem = (id) => {
    setItems(items.filter(it => it.id !== id));
  };

  // Add new part handler
  const handleAddPartSubmit = () => {
    if (!newPartForm.name.trim()) return;

    const newItem = {
      id: `inv_${Date.now()}`,
      name: newPartForm.name,
      sku: newPartForm.sku || `SKU-${Date.now().toString().slice(-4)}`,
      category: newPartForm.category,
      categoryVariant: newPartForm.category === 'فرامل' ? 'success' : newPartForm.category === 'كهرباء' ? 'warning' : 'info',
      manufacturer: newPartForm.manufacturer,
      stock: newPartForm.stock,
      maxStock: newPartForm.maxStock,
      status: newPartForm.stock <= 10 ? 'low' : newPartForm.stock <= 25 ? 'medium' : 'good',
      purchasePrice: newPartForm.purchasePrice,
      salePrice: newPartForm.salePrice,
      supplier: newPartForm.supplier || 'المورد المحلي',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3C612AkONDbqQKqmccKg77yeCYb5WmdYkaRisC62asFbBAZ7WGoRAEl490ESP0sU2Liotnm47TqraBrTrSe-I58SvymzrPr4myuzJDvf_EZS6IgHbtXGM3DCYjLju5sjhIgpU377izPCxquRQ0A8jHMGAN4W6ZKap5iP9eeihT5RFz_wjA2D0dxU48Z_RqU7YapqTPlAMiMoyYlVZZKVHZnDmH1F_LYmIC57l7d4rAXUE2u4JMCZalDX6rEUOFi5PA6q9OoHE0_w'
    };

    setItems([newItem, ...items]);
    setIsAddModalOpen(false);
    setNewPartForm({
      name: '',
      sku: '',
      category: 'فلاتر',
      manufacturer: 'Toyota',
      stock: 0,
      maxStock: 50,
      purchasePrice: 0,
      salePrice: 0,
      supplier: ''
    });
  };

  // Table columns definition
  const columns = [
    {
      key: 'item',
      label: 'القطعة',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-surface-container border border-border-slate overflow-hidden shrink-0">
            <img className="w-full h-full object-cover" src={row.image} alt={row.name} />
          </div>
          <span className="font-bold text-on-background text-sm">{row.name}</span>
        </div>
      )
    },
    {
      key: 'sku',
      label: 'رمز SKU',
      render: (row) => (
        <span className="data-mono text-xs bg-surface-container px-2 py-1 rounded border border-border-slate">
          {row.sku}
        </span>
      )
    },
    {
      key: 'category',
      label: 'الفئة',
      render: (row) => (
        <StatusBadge variant={row.categoryVariant || 'info'} label={row.category} />
      )
    },
    {
      key: 'stock',
      label: 'مستوى المخزون',
      render: (row) => (
        <StockProgress current={row.stock} max={row.maxStock} status={row.status} />
      )
    },
    {
      key: 'purchasePrice',
      label: 'سعر الشراء',
      render: (row) => (
        <span className="data-mono text-sm">{formatCurrency(row.purchasePrice)}</span>
      )
    },
    {
      key: 'salePrice',
      label: 'سعر البيع',
      render: (row) => (
        <span className="data-mono text-sm font-bold text-primary">{formatCurrency(row.salePrice)}</span>
      )
    },
    {
      key: 'supplier',
      label: 'المورد',
      render: (row) => (
        <span className="text-sm text-on-surface-variant">{row.supplier}</span>
      )
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenAdjustment(row)}
            title="تعديل المخزون"
            className="p-2 text-secondary hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">inventory_2</span>
          </button>
          <button 
            title="تعديل"
            className="p-2 text-secondary hover:bg-surface-variant rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          <button 
            onClick={() => handleDeleteItem(row.id)}
            title="حذف"
            className="p-2 text-danger-text hover:bg-danger-bg rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      )
    }
  ];

  const pagination = (
    <Pagination 
      total={inventoryResponse.pagination.total} 
      currentStart={1} 
      currentEnd={filteredItems.length} 
      hasNext={true} 
      hasPrev={false} 
      onNext={() => {}} 
      onPrev={() => {}} 
    />
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full">
      {/* Low Stock Alert Banner */}
      <AlertBanner 
        variant="danger"
        icon="warning"
        message={inventoryResponse.lowStockAlert.message}
        actionLabel="طلب من المورد"
        actionIcon="shopping_cart_checkout"
        onAction={() => console.log('Order from supplier clicked')}
      />

      {/* Inventory Header & Filtering Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white p-6 rounded-xl border border-border-slate shadow-sm">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-secondary">البحث عن قطعة</label>
            <SearchInput 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو SKU..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-secondary">الشركة المصنعة</label>
            <SelectInput 
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
              options={inventoryResponse.filters.manufacturers}
            />
          </div>

          <div className="space-y-2 flex items-end">
            <button className="w-full bg-white border border-border-slate text-secondary px-4 py-2 rounded-lg hover:bg-surface-variant transition-all flex items-center justify-center gap-2 h-[40px]">
              <span className="material-symbols-outlined text-lg">filter_list</span>
              <span>تصفية متقدمة</span>
            </button>
          </div>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary-container text-white px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-teal-hover shadow-lg shadow-primary-container/20 transition-all h-[44px]"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          <span>إضافة قطعة جديدة</span>
        </button>
      </div>

      {/* Main Table Container using reusable DataTable */}
      <DataTable 
        columns={columns}
        data={filteredItems}
        pagination={pagination}
      />

      {/* Presentational Modals */}
      <StockAdjustmentModal 
        isOpen={!!adjustingItem}
        item={adjustingItem}
        qty={adjustQty}
        reason={adjustReason}
        onClose={() => setAdjustingItem(null)}
        onQtyChange={setAdjustQty}
        onReasonChange={setAdjustReason}
        onSubmit={handleSaveAdjustment}
      />

      <AddPartModal 
        isOpen={isAddModalOpen}
        formData={newPartForm}
        onClose={() => setIsAddModalOpen(false)}
        onChange={(field, val) => setNewPartForm(prev => ({ ...prev, [field]: val }))}
        onSubmit={handleAddPartSubmit}
      />
    </div>
  );
}
