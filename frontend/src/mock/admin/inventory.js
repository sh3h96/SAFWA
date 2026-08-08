export const inventoryResponse = {
  items: [
    {
      id: 'inv_1',
      name: 'فلتر زيت تويوتا الأصلي',
      sku: 'SKU-TY-882',
      category: 'فلاتر',
      categoryVariant: 'info',
      manufacturer: 'Toyota',
      stock: 5,
      maxStock: 50,
      status: 'low',
      purchasePrice: 25,
      salePrice: 45,
      supplier: 'الوكيل المعتمد',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3C612AkONDbqQKqmccKg77yeCYb5WmdYkaRisC62asFbBAZ7WGoRAEl490ESP0sU2Liotnm47TqraBrTrSe-I58SvymzrPr4myuzJDvf_EZS6IgHbtXGM3DCYjLju5sjhIgpU377izPCxquRQ0A8jHMGAN4W6ZKap5iP9eeihT5RFz_wjA2D0dxU48Z_RqU7YapqTPlAMiMoyYlVZZKVHZnDmH1F_LYmIC57l7d4rAXUE2u4JMCZalDX6rEUOFi5PA6q9OoHE0_w'
    },
    {
      id: 'inv_2',
      name: 'فحمات فرامل نيسان',
      sku: 'SKU-NS-104',
      category: 'فرامل',
      categoryVariant: 'success',
      manufacturer: 'Nissan',
      stock: 42,
      maxStock: 60,
      status: 'good',
      purchasePrice: 120,
      salePrice: 185,
      supplier: 'مؤسسة السرعة',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDN3mIJHtQ0VlwafVK0QuAJvdlzqNbIGSUVyMnNToO4cC-_lYNURPihacBBnJ2HsvSs_0yMVxY-JShhVdHxB4o9TL5ggjg2T6rqjlBPLUI__OJ0SJH2bC4NnlddZZmDIEEk-silVAdy3e7VV8-wOnSv1my9QA__XVDtWwTGUFKZwuAIVNgRs3lhwaEoqG-JyfJtsxj3vYEV8zTweCdZTE5tUNJ9PjcC12sEsAXlLN5tQz6ZMGP00UHGud3ZmRbYRXVIvqRkLzU-M2Y'
    },
    {
      id: 'inv_3',
      name: 'بواجي إيريديوم ليزر',
      sku: 'SKU-UN-440',
      category: 'كهرباء',
      categoryVariant: 'warning',
      manufacturer: 'Universal',
      stock: 12,
      maxStock: 80,
      status: 'medium',
      purchasePrice: 15,
      salePrice: 35,
      supplier: 'متجر العالمية',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWNCWdDUYgTDgPYomrL7Tjl8O8pPWcAdZrbO7d5DTHP0mWsAbLI6fiFyr5I7l6kCxv0J_rxL0KyrLPoqQnrR6TUr3rO8VYnvd4LN8wZC8rEqWtg3Q-SdUQ4K_3GA3_Frv6gihSsXHPBI1GItjPLh0TN0sQx2C_JSfCQ4Y8jQwCki7zht5lnFHxrkAhEEE2Q17PHNCplRlddFMLp9RtDuTIGZfpuqGmBWxYmhtdyVq2uBWF7GdjQCFSZsCOFuCHuOjyJ9NFCC--5hM'
    }
  ],
  pagination: {
    total: 245,
    page: 1,
    pageSize: 10,
    currentStart: 1,
    currentEnd: 10
  },
  filters: {
    manufacturers: ['الكل', 'Toyota', 'Nissan', 'Universal']
  },
  lowStockAlert: {
    count: 4,
    message: 'تنبيه: 4 قطع وصلت إلى حد الطلب الأدنى'
  }
};
