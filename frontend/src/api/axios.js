import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { Http } from '@capacitor-community/http';

const API_URL = import.meta.env.VITE_API_URL || 'https://prod.sanjanawaterproofing.com/api';
const isNative = Capacitor.isNativePlatform();

console.log('🔧 HTTP Client initialized - isNative:', isNative, 'API_URL:', API_URL);

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Native HTTP client using Capacitor
const nativeHttpClient = {
  defaults: { baseURL: API_URL },
  
  async request(config) {
    const url = config.url?.startsWith('http') ? config.url : `${API_URL}${config.url}`;
    
    const options = {
      url,
      method: config.method?.toUpperCase() || 'GET',
      headers: { ...getAuthHeaders(), ...config.headers },
    };

    if (config.data) {
      options.data = config.data;
    }

    if (config.params) {
      const queryString = new URLSearchParams(config.params).toString();
      options.url = `${options.url}?${queryString}`;
    }

    console.log('📱 Native HTTP Request:', options.method, options.url);

    try {
      const response = await Http.request(options);
      console.log('✅ Native HTTP Response:', response.status);
      
      return {
        data: response.data,
        status: response.status,
        statusText: response.status === 200 ? 'OK' : 'Error',
        headers: response.headers,
        config: config
      };
    } catch (error) {
      console.error('❌ Native HTTP Error:', error);
      
      if (error.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      const axiosError = new Error(error.message || 'Request failed');
      axiosError.response = {
        data: error.data || { message: error.message },
        status: error.status || 500,
        statusText: error.message || 'Error',
        headers: error.headers || {}
      };
      axiosError.config = config;
      throw axiosError;
    }
  },

  async get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  },

  async post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  },

  async put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  },

  async patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  },

  async delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }
};

// Web HTTP client using axios
axios.defaults.baseURL = API_URL;

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

// Export the appropriate client based on platform
export default isNative ? nativeHttpClient : axios;
