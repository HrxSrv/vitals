import axios from 'axios';
import { getAuthToken } from '../supabase';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Debug logging for trends endpoint
  if (config.url?.includes('trends')) {
    console.log('API Request:', {
      url: config.url,
      params: config.params,
      baseURL: config.baseURL,
      hasToken: !!token,
    });
  }
  
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Debug logging for trends endpoint
    if (response.config.url?.includes('trends')) {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        dataLength: Array.isArray(response.data?.trends) ? response.data.trends.length : 'N/A',
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    // Debug logging for trends endpoint errors
    if (error.config?.url?.includes('trends')) {
      console.error('API Error:', {
        url: error.config.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }
    
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
