import { Http } from '@capacitor-community/http';
import { Capacitor } from '@capacitor/core';

// Check if we're running on a native platform
const isNative = Capacitor.isNativePlatform();

// Create a wrapper for HTTP requests that uses native HTTP on mobile
class CapacitorHttpClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'https://prod.sanjanawaterproofing.com/api';
    this.defaults = {
      baseURL: this.baseURL
    };
  }

  getHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(config) {
    if (!isNative) {
      // On web, use regular axios (imported dynamically to avoid bundling issues)
      const axios = (await import('axios')).default;
      return axios(config);
    }

    // On native, use Capacitor HTTP
    const url = config.url?.startsWith('http') 
      ? config.url 
      : `${this.baseURL}${config.url}`;

    const options = {
      url,
      method: config.method?.toUpperCase() || 'GET',
      headers: { ...this.getHeaders(), ...config.headers },
    };

    if (config.data) {
      options.data = config.data;
    }

    if (config.params) {
      const queryString = new URLSearchParams(config.params).toString();
      options.url = `${options.url}?${queryString}`;
    }

    try {
      const response = await Http.request(options);
      
      // Transform to axios-like response
      return {
        data: response.data,
        status: response.status,
        statusText: response.status === 200 ? 'OK' : 'Error',
        headers: response.headers,
        config: config
      };
    } catch (error) {
      // Transform to axios-like error
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
  }

  async get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  async post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  async put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  async patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  }

  async delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }
}

// Create and export a singleton instance
const httpClient = new CapacitorHttpClient();

export default httpClient;

