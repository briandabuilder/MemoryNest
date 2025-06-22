import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Mock user for development - no login required
const mockUser: User = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice Johnson',
  avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
  preferences: {
    theme: 'light',
    notifications: true,
    privacy: 'private'
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(mockUser); // Start with mock user
  const [loading, setLoading] = useState(false); // No loading needed

  const login = async (email: string, password: string) => {
    // Mock login - just set the user
    setUser(mockUser);
  };

  const register = async (email: string, password: string, name: string) => {
    // Mock register - just set the user
    setUser(mockUser);
  };

  const logout = async () => {
    // Mock logout - just set user to null
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    // Mock profile update
    if (user) {
      const updatedUser = { ...user, ...data, updatedAt: new Date() };
      setUser(updatedUser);
      return updatedUser;
    }
    throw new Error('No user logged in');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 