import axios from 'axios';

// The backend is running on port 5000 based on our inspection
const API_URL = 'http://localhost:5000/api';

// Centralized image URL helper to ensure reliable static media resolution
export const getImageUrl = (path) => {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const backendBaseUrl = API_URL.replace(/\/api\/?$/, '');
  return `${backendBaseUrl}${cleanPath}`;
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Centralized Error Normalization Helper
export const getErrorMessage = (error, defaultMsg = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.') => {
  if (!error) return defaultMsg;
  
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'انتهت مهلة الاتصال بالخادم. يرجى التأكد من الاتصال بالإنترنت والمحاولة مرة أخرى.';
    }
    return 'تعذر الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.';
  }

  const status = error.response.status;
  const data = error.response.data;

  // Handle HTTP 409 Conflict with detailed business context
  if (status === 409 && data) {
    if (data.isDuplicate && data.existingAppointment) {
      return `يوجد موعد نشط سابق لهذه السيارة برقم (#${data.existingAppointment.id}) وتاريخ ${new Date(data.existingAppointment.scheduled_date).toLocaleDateString('ar-EG')}.`;
    }
    if (data.candidates && data.candidates.length > 0) {
      return `تم العثور على عميل سابق يتطابق في البيانات (العدد: ${data.candidates.length}). يرجى تحديد القرار عبر نافذة تأكيد العميل.`;
    }
    if (data.requested_quantity !== undefined && data.available_stock !== undefined) {
      return `الكمية المطلوبة (${data.requested_quantity}) تتجاوز المخزون المتاح حالياً (${data.available_stock}).`;
    }
    if (data.message) {
      return data.message;
    }
  }

  // Extract validation field errors if present
  if (data && Array.isArray(data.errors) && data.errors.length > 0) {
    const fieldMsgs = data.errors.map(err => err.message).filter(Boolean);
    if (fieldMsgs.length > 0) {
      return fieldMsgs.join(' | ');
    }
  }

  // Prefer backend-provided error message if present and meaningful
  if (data && data.message && typeof data.message === 'string' && data.message !== 'Validation failed') {
    return data.message;
  }
  if (data && data.error && typeof data.error === 'string') {
    return data.error;
  }

  // Fallback status code explanations in Arabic
  switch (status) {
    case 400:
      return 'البيانات المدخلة غير صالحة. يرجى التأكد والمحاولة مرة أخرى.';
    case 401:
      return 'انتهت صلاحية الجلسة أو يجب تسجيل الدخول لطلب هذه البيانات.';
    case 403:
      return 'ليس لديك صلاحية لتنفيذ هذا الإجراء.';
    case 404:
      return 'العنصر المطلوب غير موجود أو غير متاح.';
    case 409:
      return 'تعارض في العملية: البيانات صالحة لكن لا يمكن إكمال الإجراء حالياً.';
    case 422:
      return 'البيانات المرسلة غير صحيحة أو غير كاملة.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقاً.';
    default:
      return defaultMsg;
  }
};

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling global errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthPath = requestUrl.includes('/auth/login') ||
                         requestUrl.includes('/auth/register') ||
                         requestUrl.includes('/auth/verify-email') ||
                         requestUrl.includes('/auth/forgot-password') ||
                         requestUrl.includes('/auth/reset-password');

      if (!isAuthPath) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  verifyEmail: async (params) => {
    const response = await api.get('/auth/verify-email', { params });
    return response.data;
  },
  resendVerification: async (data) => {
    const response = await api.post('/auth/resend-verification', data);
    return response.data;
  },
  forgotPassword: async (data) => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },
  resetPassword: async (data) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },
  changePassword: async (data) => {
    const response = await api.put('/users/change-password', data);
    return response.data;
  },
};

export const usersAPI = {
  getAll: async (search = '') => {
    const response = await api.get('/users', { params: { search } });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  create: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  updateStatus: async (id) => {
    const response = await api.put(`/users/${id}/status`);
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },
  changePassword: async (data) => {
    const response = await api.put('/users/change-password', data);
    return response.data;
  },
};

export const auditLogsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  }
};

export const vehiclesAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/vehicles', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },
  getHistory: async (id) => {
    const response = await api.get(`/vehicles/${id}/history`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/vehicles', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/vehicles/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  }
};

export const inventoryAPI = {
  getAll: async (search = '') => {
    const response = await api.get('/inventory', { params: { search } });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },
  create: async (partData) => {
    const response = await api.post('/inventory', partData);
    return response.data;
  },
  update: async (id, partData) => {
    const response = await api.put(`/inventory/${id}`, partData);
    return response.data;
  },
  adjustStock: async (id, stock_quantity) => {
    const response = await api.put(`/inventory/${id}/stock`, { stock_quantity });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  }
};

export const requiredPartsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/required-parts', { params });
    return response.data;
  },
  submit: async (data) => {
    const response = await api.post('/required-parts', data);
    return response.data;
  },
  updateRequest: async (id, quantity) => {
    const response = await api.put(`/required-parts/${id}`, { quantity });
    return response.data;
  },
  cancelRequest: async (id) => {
    const response = await api.delete(`/required-parts/${id}`);
    return response.data;
  },
  approvePart: async (id, price) => {
    const response = await api.put(`/required-parts/${id}/approval`, { price });
    return response.data;
  },
  installPart: async (id) => {
    const response = await api.put(`/required-parts/${id}/installation`);
    return response.data;
  },
  rejectPart: async (id) => {
    const response = await api.put(`/required-parts/${id}/rejection`);
    return response.data;
  },
  updateApproval: async (decisions) => {
    const response = await api.put('/required-parts/approval', { decisions });
    return response.data;
  }
};

export const technicalReportsAPI = {
  create: async (data) => {
    const response = await api.post('/technical-reports', data);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/technical-reports/${id}`);
    return response.data;
  },
  getByAppointment: async (appointmentId) => {
    const response = await api.get(`/technical-reports/appointment/${appointmentId}`);
    return response.data;
  }
};

export const newPartRequestsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/new-part-requests', { params });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/new-part-requests', data);
    return response.data;
  },
  approve: async (id) => {
    const response = await api.put(`/new-part-requests/${id}/approve`);
    return response.data;
  },
  reject: async (id, rejection_reason) => {
    const response = await api.put(`/new-part-requests/${id}/reject`, { rejection_reason });
    return response.data;
  }
};

export const appointmentsAPI = {
  getAll: async (search = '') => {
    const response = await api.get('/appointments', { params: { search } });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },
  updateStatus: async (id, data) => {
    const response = await api.put(`/appointments/${id}`, data);
    return response.data;
  },
  requestRework: async (id, data) => {
    const response = await api.post(`/appointments/${id}/rework`, data);
    return response.data;
  }
};

export const handoverAPI = {
  performHandover: async (appointmentId, data = {}) => {
    const response = await api.post(`/appointments/${appointmentId}/handover`, data);
    return response.data;
  }
};

export const financialsAPI = {
  getPendingReports: (search = '') => api.get('/invoices/reports', { params: { search } }).then(res => res.data),
  issueInvoice: (data) => api.post('/invoices/issue', data).then(res => res.data),
  getInvoiceById: (id) => api.get(`/invoices/${id}`).then(res => res.data),
  getFinancialSummary: (params = {}) => api.get('/invoices/financial-summary', { params }).then(res => res.data),
};

export const paymentsAPI = {
  recordPayment: async (invoiceId, data) => {
    const response = await api.post(`/invoices/${invoiceId}/pay`, data);
    return response.data;
  },
  getPaymentsByInvoice: async (invoiceId) => {
    const response = await api.get('/payments', { params: { invoice_id: invoiceId } });
    return response.data;
  }
};

export const walkInAPI = {
  getAllCustomers: async (params = {}) => {
    const response = await api.get('/walk-in-customers', { params });
    return response.data;
  },
  getCustomerHistory: async (customerId) => {
    const response = await api.get(`/walk-in-customers/${customerId}/history`);
    return response.data;
  },
  getCustomerVisits: async (customerId) => {
    const response = await api.get(`/walk-in-customers/${customerId}/visits`);
    return response.data;
  },
  createWithVisit: async (data) => {
    const response = await api.post('/walk-in-customers/with-visit', data);
    return response.data;
  },
  resolveCandidate: async (data) => {
    const response = await api.post('/walk-in-customers/resolve', data);
    return response.data;
  }
};

export const uploadsAPI = {
  uploadImage: async (formData) => {
    const response = await api.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  deleteImage: async (data) => {
    const response = await api.delete('/uploads/image', { data });
    return response.data;
  }
};

export const reviewsAPI = {
  getAll: () => api.get('/reviews').then(res => res.data),
};

export const mechanicAPI = {
  getTasks: () => api.get('/appointments/assigned').then(res => res.data),
  submitDiagnosis: (data) => api.post('/reports', data).then(res => res.data),
  submitPartsRequest: (data) => api.post('/required-parts', data).then(res => res.data),
  updateAppointmentStatus: (id, status) => api.put(`/appointments/${id}`, { status }).then(res => res.data),
};

export const clientAPI = {
  getMyVehicles: () => api.get('/vehicles/my').then(res => res.data),
  createVehicle: (data) => api.post('/vehicles', data).then(res => res.data),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data).then(res => res.data),
  getAvailableSlots: () => api.get('/appointments/slots').then(res => res.data),
  createAppointment: (data) => api.post('/appointments', data).then(res => res.data),
  getMyAppointments: () => api.get('/appointments/my').then(res => res.data),
  submitPartsApproval: (decisions) => api.put('/required-parts/approval', { decisions }).then(res => res.data),
  getMyInvoices: () => api.get('/invoices/my').then(res => res.data),
  payInvoice: (id, data) => api.post(`/invoices/${id}/pay`, data).then(res => res.data),
  submitReview: (data) => api.post('/reviews', data).then(res => res.data),
};

export default api;
