import api from './axios';

// ============= DASHBOARD =============
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getCRMStats: () => api.get('/dashboard/crm-stats'),
  getInventoryStats: () => api.get('/dashboard/inventory-stats'),
  getEmployeeStats: () => api.get('/dashboard/employee-stats'),
  getRevenueStats: (months = 6) => api.get(`/dashboard/revenue-stats?months=${months}`),
  getRecentActivities: (limit = 10) => api.get(`/dashboard/recent-activities?limit=${limit}`),
  getNotificationCounts: () => api.get('/dashboard/notifications')
};

// ============= CUSTOMERS =============
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getStats: () => api.get('/customers/stats')
};

// ============= PROJECTS =============
export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  getHistory: (id) => api.get(`/projects/${id}/history`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  updateStatus: (id, status) => api.put(`/projects/${id}/status`, { status }),
  markComplete: (id) => api.put(`/projects/${id}/mark-complete`),
  delete: (id) => api.delete(`/projects/${id}`),
  
  // Team assignment
  assignEmployee: (id, data) => api.post(`/projects/${id}/assign-employee`, data),
  
  // Work updates & comments
  addWorkUpdate: (id, data) => api.post(`/projects/${id}/work-update`, data),
  addComment: (id, data) => api.post(`/projects/${id}/comment`, data),
  
  // File uploads
  uploadFiles: (id, formData) => api.post(`/projects/${id}/upload-files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Existing
  addSiteVisit: (id, data) => api.post(`/projects/${id}/site-visit`, data),
  uploadImages: (id, formData) => api.post(`/projects/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  addMaterial: (id, data) => api.post(`/projects/${id}/materials`, data),
  addReturnedMaterial: (id, data) => api.post(`/projects/${id}/return-materials`, data),
  generateQuotation: (id) => api.get(`/projects/${id}/quotation`),
  generateWarranty: (id) => api.get(`/projects/${id}/warranty`)
};

// ============= INVENTORY =============
export const inventoryAPI = {
  // Materials
  getMaterials: (params) => api.get('/inventory/materials', { params }),
  getMaterial: (id) => api.get(`/inventory/materials/${id}`),
  getMaterialHistory: (id) => api.get(`/inventory/materials/${id}/history`),
  createMaterial: (data) => api.post('/inventory/materials', data),
  updateMaterial: (id, data) => api.put(`/inventory/materials/${id}`, data),
  deleteMaterial: (id) => api.delete(`/inventory/materials/${id}`),
  materialInward: (id, data) => api.post(`/inventory/materials/${id}/inward`, data),
  materialOutward: (id, data) => api.post(`/inventory/materials/${id}/outward`, data),
  returnMaterial: (id, data) => api.post(`/inventory/materials/${id}/return`, data),
  getLowStock: () => api.get('/inventory/materials/low-stock'),
  autoRestock: (data) => api.post('/inventory/materials/auto-restock', data),
  bulkOperations: (data) => api.post('/inventory/materials/bulk-operations', data),
  
  // Vendors
  getVendors: (params) => api.get('/inventory/vendors', { params }),
  getVendor: (id) => api.get(`/inventory/vendors/${id}`),
  createVendor: (data) => api.post('/inventory/vendors', data),
  updateVendor: (id, data) => api.put(`/inventory/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/inventory/vendors/${id}`),
  addVendorInvoice: (id, data) => api.post(`/inventory/vendors/${id}/invoice`, data),
  
  // Reports
  getStockSummary: () => api.get('/inventory/reports/stock-summary')
};

// ============= EMPLOYEES =============
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  getByRole: (role) => api.get(`/employees/by-role/${role}`),
  getProjects: (id) => api.get(`/employees/${id}/projects`),
  getTeam: (id) => api.get(`/employees/${id}/team`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  updateRole: (id, data) => api.put(`/employees/${id}/role`, data),
  assignProject: (id, data) => api.post(`/employees/${id}/assign-project`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  
  // Attendance
  markAttendance: (id, data) => api.post(`/employees/${id}/attendance`, data),
  getAttendance: (id, params) => api.get(`/employees/${id}/attendance`, { params }),
  
  // Leave
  applyLeave: (id, data) => api.post(`/employees/${id}/leave`, data),
  updateLeaveStatus: (leaveId, data) => api.put(`/employees/leave/${leaveId}`, data),
  
  // Salary
  processSalary: (id, data) => api.post(`/employees/${id}/salary`, data),
  getSalaryHistory: (id) => api.get(`/employees/${id}/salary-history`),
  generatePayslip: (id, month) => api.get(`/employees/${id}/payslip/${month}`),
  
  // Work Updates
  addWorkUpdate: (id, data) => api.post(`/employees/${id}/work-update`, data),
  getWorkUpdates: (id) => api.get(`/employees/${id}/work-updates`),
  
  // Employee Self-Service
  myAttendance: {
    mark: (data) => api.post('/employees/my-attendance', data),
    get: (params) => api.get('/employees/my-attendance', { params })
  },
  myProfile: () => api.get('/employees/my-profile'),
  mySalary: () => api.get('/employees/my-salary'),
  myProjects: () => api.get('/employees/my-projects'),
  myWorkUpdate: (data) => api.post('/employees/my-work-update', data),
  myLeave: {
    apply: (data) => api.post('/employees/my-leave', data),
    get: () => api.get('/employees/my-leaves')
  },
  myReminders: {
    get: (params) => api.get('/employees/my-reminders', { params }),
    create: (data) => api.post('/employees/my-reminder', data),
    update: (id, data) => api.put(`/employees/my-reminder/${id}`, data),
    reset: () => api.delete('/employees/my-reminders/reset')
  },
  myPayslip: (month) => api.get(`/employees/my-payslip/${month}`),
  geocode: (params) => api.get('/employees/geocode', { params })
};

// ============= INVOICES =============
export const invoiceAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  generatePDF: (id) => api.get(`/invoices/${id}/pdf`),
  sendEmail: (id) => api.post(`/invoices/${id}/send-email`)
};

// ============= PAYMENTS =============
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  getByInvoice: (invoiceId) => api.get(`/payments/invoice/${invoiceId}`),
  createOrder: (data) => api.post('/payments/create-order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  recordManual: (data) => api.post('/payments/manual', data)
};

// ============= REMINDERS =============
export const reminderAPI = {
  getAll: (params) => api.get('/reminders', { params }),
  getUpcoming: () => api.get('/reminders/upcoming'),
  create: (data) => api.post('/reminders', data),
  update: (id, data) => api.put(`/reminders/${id}`, data),
  complete: (id) => api.put(`/reminders/${id}/complete`),
  delete: (id) => api.delete(`/reminders/${id}`)
};

// ============= AUTH =============
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  getAll: () => api.get('/auth/users'),
  update: (id, data) => api.put(`/auth/users/${id}`, data),
  delete: (id) => api.delete(`/auth/users/${id}`),
  resetPassword: (id, data) => api.put(`/auth/users/${id}/reset-password`, data),
  makeAdmin: (id) => api.put(`/auth/users/${id}/make-admin`),
  updatePassword: (data) => api.put('/auth/update-password', data),
  logout: () => api.post('/auth/logout')
};

// ============= SETTINGS =============
export const settingsAPI = {
  // Admin settings
  getAll: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  
  // User settings
  getMySettings: () => api.get('/settings/my-settings'),
  updateMySettings: (data) => api.put('/settings/my-settings', data)
};

// ============= INVOICE SETTINGS =============
export const invoiceSettingsAPI = {
  getAll: () => api.get('/invoice-settings'),
  update: (data) => api.put('/invoice-settings', data),
  syncFromSettings: () => api.post('/invoice-settings/sync-from-settings'),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/invoice-settings/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Export all APIs
export default {
  dashboard: dashboardAPI,
  customers: customerAPI,
  projects: projectAPI,
  inventory: inventoryAPI,
  employees: employeeAPI,
  invoices: invoiceAPI,
  payments: paymentAPI,
  reminders: reminderAPI,
  auth: authAPI,
  settings: settingsAPI,
  invoiceSettings: invoiceSettingsAPI
};
