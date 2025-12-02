import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Set base URL
axios.defaults.baseURL = API_URL;

// Add token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Debug: Log request data for invoice creation (especially quotations)
  if (config.url?.includes('/invoices') && config.method === 'post' && config.data) {
    console.log('🌐 Axios Request - URL:', config.url);
    console.log('🌐 Axios Request - Data:', JSON.stringify(config.data, null, 2));
    console.log('🌐 Axios Request - quotationFileUrl in data:', config.data.quotationFileUrl);
  }
  
  return config;
});

// Handle response errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axios;
