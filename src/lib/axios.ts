import axios, { AxiosError } from 'axios';
import { SignupData, AuthResponse, OTPData, LoginData, VerifyOtpResponse } from '@/types/auth';

const api = axios.create({
  baseURL: '/api',  
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('Axios response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });

    if (response.config.url?.includes('/auth/')) {
      console.log('Auth endpoint response:', response.data);
      if (response.data.error) {
        return Promise.reject(new Error(response.data.error));
      }
    }

    return response.data;
  },
  (error: AxiosError<{ error?: string; message?: string; errors?: Array<{ field?: string; message: string }> }>) => {
    console.log('Axios error interceptor:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response) {
      const data = error.response.data;
      const message =
        data?.message || data?.error || `Server error: ${error.response.status}`;
      
      const enrichedError = Object.assign(new Error(message), {
        status: error.response.status,
        response: error.response,
        fieldErrors: Array.isArray(data?.errors) ? data.errors : undefined
      });
      
      return Promise.reject(enrichedError);
    } else if (error.request) {
      return Promise.reject(new Error('No response from server. Please check your connection.'));
    } else {
      return Promise.reject(new Error(error.message || 'Failed to make request'));
    }
  }
);

export const authApi = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    return api.post('/auth/signup', data);
  },
  
  verifyOtp: async (data: OTPData): Promise<VerifyOtpResponse> => {
    return api.post('/auth/verify-otp', data);
  },
  
  resendOtp: async (email: string): Promise<{ message: string }> => {
    return api.post('/auth/resend-otp', { email });
  },
  
  login: async (data: LoginData): Promise<AuthResponse> => {
    return api.post('/auth/login', data);
  },
};

export default api;