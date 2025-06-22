import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../types';

// Custom error class
export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error | CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let err = error;

  // If error is not a CustomError, create one
  if (!(err instanceof CustomError)) {
    const statusCode = (err as any).statusCode || 500;
    const message = err.message || 'Something went wrong';
    err = new CustomError(message, statusCode);
  }

  const customError = err as CustomError;

  // Log error
  logger.error(`Error ${customError.statusCode}: ${customError.message}`, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: customError.stack,
  });

  // Handle specific error types
  if (customError.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: customError.message,
      details: (customError as any).details,
    });
    return;
  }

  if (customError.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: 'The provided ID is not valid',
    });
    return;
  }

  if (customError.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'The provided token is not valid',
    });
    return;
  }

  if (customError.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'The provided token has expired',
    });
    return;
  }

  if (customError.name === 'MulterError') {
    res.status(400).json({
      success: false,
      error: 'File Upload Error',
      message: customError.message,
    });
    return;
  }

  // Default error response
  res.status(customError.statusCode).json({
    success: false,
    error: customError.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: customError.stack,
    }),
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
};

// Validation error helper
export const createValidationError = (message: string, details?: any) => {
  const error = new CustomError(message, 400);
  error.name = 'ValidationError';
  (error as any).details = details;
  return error;
};

// Authentication error helper
export const createAuthError = (message: string = 'Authentication required') => {
  return new CustomError(message, 401);
};

// Authorization error helper
export const createForbiddenError = (message: string = 'Access denied') => {
  return new CustomError(message, 403);
};

// Not found error helper
export const createNotFoundError = (resource: string = 'Resource') => {
  return new CustomError(`${resource} not found`, 404);
};

// Conflict error helper
export const createConflictError = (message: string) => {
  return new CustomError(message, 409);
};

// Rate limit error helper
export const createRateLimitError = (message: string = 'Too many requests') => {
  return new CustomError(message, 429);
}; 