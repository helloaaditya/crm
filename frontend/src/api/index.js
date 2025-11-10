import api from './axios';

// ============= DASHBOARD =============
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getCRMStats: () => api.get('/dashboard/crm-stats'),
  getInventoryStats: () => api.get('/dashboard/inventory-stats'),
  getEmployeeStats: () => api.get('/dashboard/employee-stats'),
  getRevenueStats: (months = 6) => api.get(`/dashboard/revenue-stats?months=${months}`),
  getRecentActivities: (limit = 10) => api.get(`/dashboard/recent-activities?limit=${limit}`),
  getNotificationCounts: () => api.get('/dashboard/notifications'),
  getDailyRevenueTrends: (params) => api.get('/dashboard/daily-revenue-trends', { params }),
  getPaymentReminders: (params) => api.get('/dashboard/payment-reminders', { params })
};

// ============= CUSTOMERS =============
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getStats: () => api.get('/customers/stats'),
  bulk: {
    sample: () => api.get('/customers/bulk/sample', { responseType: 'text' }),
    upload: (formData) => api.post('/customers/bulk/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  }
};

// ============= PROJECTS =============
export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  getHistory: (id) => api.get(`/projects/${id}/history`),
  deleteMedia: (id, data) => api.delete(`/projects/${id}/history/media`, { data }),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  updateStatus: (id, status) => api.put(`/projects/${id}/status`, { status }),
  markComplete: (id) => api.put(`/projects/${id}/mark-complete`),
  delete: (id) => api.delete(`/projects/${id}`),
  
  // Team assignment
  assignEmployee: (id, data) => api.post(`/projects/${id}/assign-employee`, data),
  removeEmployee: (id, employeeId) => api.delete(`/projects/${id}/remove-employee/${employeeId}`),
  
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
  importMaterials: (formData) => api.post('/inventory/materials/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
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

// ============= MACHINERY =============
export const machineryAPI = {
  getAll: (params) => api.get('/machinery', { params }),
  getById: (id) => api.get(`/machinery/${id}`),
  create: (data) => api.post('/machinery', data),
  update: (id, data) => api.put(`/machinery/${id}`, data),
  delete: (id) => api.delete(`/machinery/${id}`),
  assignToProject: (id, data) => api.post(`/machinery/${id}/assign`, data),
  returnFromProject: (id, data) => api.post(`/machinery/${id}/return`, data),
  getProjectAssignments: (projectId) => api.get(`/machinery/project/${projectId}/assignments`),
  uploadImage: (machineryId, formData) => api.post(`/machinery/${machineryId}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDashboardStats: () => api.get('/machinery/dashboard/stats')
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
  updateAttendance: (id, attendanceId, data) => api.put(`/employees/${id}/attendance/${attendanceId}`, data),
  autoGenerateAttendance: () => api.post('/employees/attendance/auto-generate'),
  generateMissingAttendance: (id) => api.post(`/employees/${id}/attendance/generate-missing`),
  bulk: {
    sample: () => api.get('/employees/bulk/sample', { responseType: 'text' }),
    upload: (formData) => api.post('/employees/bulk/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  
  // Leave
  applyLeave: (id, data) => api.post(`/employees/${id}/leave`, data),
  updateLeaveStatus: (leaveId, data) => api.put(`/employees/leave/${leaveId}`, data),
  
  // Comp Off
  grantCompOff: (id, data) => api.post(`/employees/${id}/compoff/grant`, data),
  
  // Salary
  processSalary: (id, data) => api.post(`/employees/${id}/salary`, data),
  getSalaryHistory: (id) => api.get(`/employees/${id}/salary-history`),
  getSalaryPreview: (id, month) => api.get(`/employees/${id}/salary-preview`, { params: { month } }),
  downloadPayslip: (employeeId, salaryId) => api.get(`/employees/${employeeId}/salary/${salaryId}/payslip`, { responseType: 'blob' }),
  // Hold Requests (admin)
  holdRequests: {
    list: (params) => api.get('/employees/hold-requests', { params }),
    approve: (requestId, data) => api.put(`/employees/hold-requests/${requestId}/approve`, data),
    reject: (requestId, data) => api.put(`/employees/hold-requests/${requestId}/reject`, data)
  },
  
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
  myHold: {
    get: () => api.get('/employees/my-hold'),
    request: (data) => api.post('/employees/my-hold/request', data)
  },
  myProjects: () => api.get('/employees/my-projects'),
  myWorkUpdate: (data) => api.post('/employees/my-work-update', data),
  uploadWorkUpdateFiles: (formData) => api.post('/employees/upload-work-files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
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
  myPayslip: (month) => api.get(`/employees/my-payslip/${month}`, { responseType: 'blob' }),
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
  sendEmail: (id) => api.post(`/invoices/${id}/send-email`),
  convertToInvoice: (id) => api.post(`/invoices/${id}/convert-to-invoice`)
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
  register: (data) => api.post('/auth/register', data, { timeout: 60000 }), // 60 second timeout for user creation
  getMe: () => api.get('/auth/me'),
  getAll: () => api.get('/auth/users'),
  update: (id, data) => api.put(`/auth/users/${id}`, data, { timeout: 60000 }), // 60 second timeout for updates
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

// ============= NOTIFICATIONS =============
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markMultipleAsRead: (notificationIds) => api.put('/notifications/read-multiple', { notificationIds }),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  deleteAllRead: () => api.delete('/notifications/read')
};

// ============= EXPENSES =============
export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  getMyExpenses: () => api.get('/expenses/my-expenses'),
  create: (data) => api.post('/expenses/my-expense', data),
  update: (id, data) => api.put(`/expenses/my-expense/${id}`, data),
  delete: (id) => api.delete(`/expenses/my-expense/${id}`),
  approve: (id, data) => api.put(`/expenses/${id}/approve`, data),
  reject: (id, data) => api.put(`/expenses/${id}/reject`, data),
  pay: (id, data) => api.put(`/expenses/${id}/pay`, data),
  getStats: (params) => api.get('/expenses/stats', { params }),
  uploadDocuments: (formData) => api.post('/expenses/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// ============= LOCATION TRACKING =============
export const locationTrackingAPI = {
  startTracking: (data) => api.post('/location-tracking/start', data),
  updateLocation: (data) => api.post('/location-tracking/update', data),
  stopTracking: (data) => api.post('/location-tracking/stop', data),
  getMyStatus: () => api.get('/location-tracking/my-status'),
  getActiveLocations: () => api.get('/location-tracking/active'),
  getHistory: (employeeId, params) => api.get(`/location-tracking/history/${employeeId}`, { params }),
  getStats: () => api.get('/location-tracking/stats')
};

// Export all APIs
export default {
  dashboard: dashboardAPI,
  customers: customerAPI,
  projects: projectAPI,
  inventory: inventoryAPI,
  machinery: machineryAPI,
  employees: employeeAPI,
  invoices: invoiceAPI,
  payments: paymentAPI,
  reminders: reminderAPI,
  auth: authAPI,
  settings: settingsAPI,
  invoiceSettings: invoiceSettingsAPI,
  notifications: notificationAPI,
  expenses: expenseAPI,
  locationTracking: locationTrackingAPI
};
