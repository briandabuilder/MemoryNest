import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createAuthError, createForbiddenError } from './errorHandler';
import { User } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// JWT token verification middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createAuthError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw createAuthError('No token provided');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (!decoded || !decoded.userId) {
      throw createAuthError('Invalid token');
    }

    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      createdAt: new Date(decoded.createdAt),
      updatedAt: new Date(decoded.updatedAt),
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createAuthError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createAuthError('Token expired'));
    } else {
      next(error);
    }
  }
};

// Optional auth middleware (doesn't throw error if no token)
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (decoded && decoded.userId) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        createdAt: new Date(decoded.createdAt),
        updatedAt: new Date(decoded.updatedAt),
      };
    }

    next();
  } catch (error) {
    // Don't throw error for optional auth, just continue
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createAuthError('Authentication required'));
    }

    // For now, we'll use a simple role system
    // You can extend this based on your user roles
    const userRole = (req.user as any).role || 'user';

    if (!roles.includes(userRole)) {
      return next(createForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

// Generate JWT token
export const generateToken = (user: User): string => {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Verify JWT token (for use in services)
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    throw createAuthError('Invalid token');
  }
}; 