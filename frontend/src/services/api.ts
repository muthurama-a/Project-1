import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Use 'token' as the primary key
  const token = localStorage.getItem('token') || localStorage.getItem('thingual_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the error is 401 (Unauthorized), the token is likely expired or invalid
    if (error.response?.status === 401) {
      console.warn('[API] Unauthorized access detected. Clearing session...');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('thingual_token');
        localStorage.removeItem('thingual_user');
        
        // Only redirect if we're not already on the landing page
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
