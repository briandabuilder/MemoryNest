import express from 'express';
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { User } from '../types';

const router = express.Router();

// Mock users for development
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

// Get all available users (for demo purposes)
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: mockUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar
    }))
  });
}));

// Get current user profile
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string || 'user-1';
  const user = mockUsers.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  return res.json({
    success: true,
    data: user
  });
}));

// Update user profile
router.put('/profile', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string || 'user-1';
  const user = mockUsers.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  const { name, avatar, preferences } = req.body;
  
  // Update user (in a real app, this would save to database)
  if (name) user.name = name;
  if (avatar) user.avatar = avatar;
  if (preferences) user.preferences = { ...user.preferences, ...preferences };
  user.updatedAt = new Date();

  return res.json({
    success: true,
    data: user,
    message: 'Profile updated successfully'
  });
}));

export default router; 