import axios from 'axios';

// The backend is running on port 5000 based on our inspection
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
      // Clear token and redirect to login on 401
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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
};

export const usersAPI = {
  getAll: async (search = '') => {
    const response = await api.get('/users', { params: { search } });
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
  create: async (partData) => {
    const response = await api.post('/inventory', partData);
    return response.data;
  },
  update: async (id, partData) => {
    const response = await api.put(`/inventory/${id}`, partData);
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
  }
};

export const financialsAPI = {
  getPendingReports: (search = '') => api.get('/invoices/reports', { params: { search } }).then(res => res.data),
  issueInvoice: (data) => api.post('/invoices/issue', data).then(res => res.data),
  getInvoiceById: (id) => api.get(`/invoices/${id}`).then(res => res.data),
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
