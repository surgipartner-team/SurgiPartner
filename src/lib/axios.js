import axios from 'axios';

// Create axios instance with defaults
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 30000,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor - add CSRF token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Add custom headers for fingerprinting
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle common errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific status codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          break;
        case 429:
          // Rate limited
          console.warn('Rate limit exceeded');
          break;
        case 403:
          // Forbidden - might be CSRF issue
          console.error('Access forbidden');
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;