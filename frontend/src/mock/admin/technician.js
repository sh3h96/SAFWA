export const technicianResponse = {
  profile: {
    name: 'م/ محمد علي',
    status: 'نشط الآن',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9Rl9nXa_TwcaCZpuysqtrGw3ytlPoRNHGhb2xIdJ4SSI-_BlCtm9FBY1dH7750QGYYftktcMXNn7kr79I_Pdh2wnaglZ9iYdtdxwpSN3FL7DB3zRsjRrztbfx6B7YBiYBKjmXH_PZDu1umt03sbgVHEfLHqMlqFMCfLgMAddUEyHe_lNfapYnBpCw5RRJrsbkOsWIlBOGTFUUnhBpORI_77b4wEiNweToJohz81J7MMm80-CUmD3VWcQ2HOZp_N1VQhQLRGo4DA4'
  },
  stats: {
    remainingVehicles: 4,
    completedToday: 12
  },
  activeTask: {
    id: 'task_active_1',
    vehicleModel: 'Lexus ES350 - موديل 2023',
    plateNumber: 'ر س د 9 8 7',
    complaints: [
      { icon: 'priority_high', label: 'صوت بالفرامل' },
      { icon: 'water_drop', label: 'تسريب زيت' }
    ],
    description: 'العميل يشتكي من صوت صفير عند الضغط على الفرامل في السرعات المنخفضة، مع ملاحظة بقع زيت أسفل المحرك عند التوقف لفترة طويلة.',
    elapsedSeconds: 5140, // 01:25:40
    status: 'in_progress',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHEK0YD-vkDGZJ3br21213ARKruIJqo_g3L3G2DbPLgKYBp4xN21TX-qMOMogBu_4CHm9Bh_NJLOZTWfB86b-1qZ3tTqkCoxjlCqCiVraunrW8IhZlaoDhIrhLnqXRWFuEKCyMfqIJX29jIhRmNDSaNbPsDcHR1ai4eotd4Lo-RxU1GI43FxY9MwQhSQtVoBzo1bGh3CYOzuAX2ASH4_O_7gHQP-y8-eYhBWtj9RQKyNfh5UJj9cQdd6Ec18Gm0BjVsFFg4p7402Q'
  },
  upcomingTasks: [
    {
      id: 'task_up_1',
      vehicleModel: 'Toyota Camry 2022',
      plateNumber: 'أ ب ج 1 2 3',
      serviceType: 'صيانة دورية',
      deliveryTime: '04:30 م',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8lwqonfg-MTu0v8fhHLdnYkoVVPM21NwTfQRoZOEtn9srwF6EALKPdSKveALgOoWdYSg8TYqNUJ_phj5PR46GiMBA0J8GZbrsqfN9TqD99xMNzfLJ8E_nzH6j1H1i8MEhqa3Gqqsk-C0ovlJORMas0pjRYaJccOf6cYBwU5iOyNQ5b-B7c0MzOAYdA9fSB43fwyvkJ6muxUYrr7gsRuTpWyT8YyTljsAHJ7NW4s_M3lhWzKgt2qn_JbvKoQhHGHIrcT55FGGa-0s'
    },
    {
      id: 'task_up_2',
      vehicleModel: 'BMW X5 2024',
      plateNumber: 'ح ط ي 5 5 5',
      serviceType: 'فحص كمبيوتر',
      deliveryTime: '06:00 م',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBaDLTDq8qhQe53uZn-9up0ktvCkF70q7FIIKRUYmwawTSqhoim9CaT8ajSQbnUqznWXkwIUd8AYeIinj7dLt5f1uqer-aVVQ1ghNDPizGTETTMQrDroZfDmVPGFXUIMpdxtoQxbdm0HcE3tltpcT4eUcmBN18_UnnhmLHXBBzkImXkxmxPeGkvINtLOXSxI68lcIDANNUuS3Yg1HYLiAUhA3A3ZdHdnYXfnHWBeLfKCKXHvEf7_VGLGqgfMRgebopVzlxBUNrxGmE'
    }
  ]
};
