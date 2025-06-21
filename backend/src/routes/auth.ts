import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { generateToken } from '../middleware/auth';
import { createRecord, getRecordById, updateRecord } from '../services/database';
import { User, RegisterRequest, LoginRequest, AuthResponse } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// Register new user
router.post('/register', validateRegistration, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { email, password, name }: RegisterRequest = req.body;

  try {
    // Check if user already exists
    const existingUser = await getRecordById<User>('users', email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userData: Partial<User> = {
      id: uuidv4(),
      email,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const user = await createRecord<User>('users', userData);

    // Generate JWT token
    const token = generateToken(user);

    const response: AuthResponse = {
      user,
      token,
    };

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      data: response,
      message: 'User registered successfully',
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
    });
  }
}));

// Login user
router.post('/login', validateLogin, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { email, password }: LoginRequest = req.body;

  try {
    // Find user by email
    const user = await getRecordById<User>('users', email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    const response: AuthResponse = {
      user,
      token,
    };

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      data: response,
      message: 'Login successful',
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
}));

// Get current user profile
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    const user = await getRecordById<User>('users', req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Remove sensitive data
    const { password, ...userProfile } = user;

    res.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
}));

// Update user profile
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
], asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { name, email } = req.body;

  try {
    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await getRecordById<User>('users', email);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({
          success: false,
          error: 'Email already taken',
        });
      }
    }

    // Update user
    const updateData: Partial<User> = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const updatedUser = await updateRecord<User>('users', req.user.id, updateData);

    // Remove sensitive data
    const { password, ...userProfile } = updatedUser;

    logger.info(`User profile updated: ${req.user.email}`);

    res.json({
      success: true,
      data: userProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
}));

// Change password
router.put('/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    // Get current user with password
    const user = await getRecordById<User>('users', req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password || '');
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await updateRecord<User>('users', req.user.id, {
      password: hashedNewPassword,
      updatedAt: new Date(),
    });

    logger.info(`Password changed for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
}));

// Logout (client-side token removal)
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  // In a stateless JWT setup, logout is handled client-side
  // This endpoint can be used for logging purposes
  logger.info(`User logged out: ${req.user?.email || 'Unknown'}`);

  res.json({
    success: true,
    message: 'Logout successful',
  });
}));

// Verify token validity
router.get('/verify', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }

  res.json({
    success: true,
    data: {
      user: req.user,
      valid: true,
    },
  });
}));

export default router; 