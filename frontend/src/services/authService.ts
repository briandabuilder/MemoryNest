import apiService from './api';
import { User, LoginForm, RegisterForm, ApiResponse } from '../types';

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiService.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Login failed');
    }
    
    return response.data;
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await apiService.post<ApiResponse<AuthResponse>>('/auth/register', {
      name,
      email,
      password,
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Registration failed');
    }
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      // Even if logout fails on server, we should clear local storage
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<ApiResponse<User>>('/auth/me');
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get current user');
    }
    
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiService.put<ApiResponse<User>>('/auth/profile', data);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update profile');
    }
    
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiService.put<ApiResponse<void>>('/auth/password', {
      currentPassword,
      newPassword,
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to change password');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const response = await apiService.post<ApiResponse<void>>('/auth/forgot-password', {
      email,
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to send reset email');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await apiService.post<ApiResponse<void>>('/auth/reset-password', {
      token,
      newPassword,
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to reset password');
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await apiService.post<ApiResponse<AuthResponse>>('/auth/refresh');
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to refresh token');
    }
    
    return response.data;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  removeToken(): void {
    localStorage.removeItem('token');
  }
}

export const authService = new AuthService();
export default authService; 