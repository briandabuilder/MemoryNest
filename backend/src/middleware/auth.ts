import { Request, Response, NextFunction } from 'express';
import { User } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Mock user for development - in production this would be replaced with proper auth
const mockUsers: User[] = [
  {
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
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    name: 'Bob Smith',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    preferences: {
      theme: 'dark',
      notifications: false,
      privacy: 'friends'
    },
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: 'user-3',
    email: 'carol@example.com',
    name: 'Carol Davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    preferences: {
      theme: 'light',
      notifications: true,
      privacy: 'public'
    },
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
];

export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  // For development, use the first user as default
  // In a real app, this would check for a valid token
  const userId = req.headers['x-user-id'] as string || 'user-1';
  
  const user = mockUsers.find(u => u.id === userId);
  
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'User not found'
    });
    return;
  }

  req.user = user;
  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.headers['x-user-id'] as string;
  
  if (userId) {
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      req.user = user;
    }
  }
  
  next();
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // For now, we'll use a simple role system
    // You can extend this based on your user roles
    const userRole = (req.user as any).role || 'user';

    if (!roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

// Helper function to get mock users (for testing/development)
export const getMockUsers = (): User[] => {
  return mockUsers;
}; 