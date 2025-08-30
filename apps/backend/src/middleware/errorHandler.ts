import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Request data is invalid',
      details: validationErrors,
    });
    return;
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      message: error.message,
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Authentication token is invalid',
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Authentication token has expired',
    });
    return;
  }

  // Handle database errors
  if (error.message.includes('SQLITE_')) {
    let message = 'Database operation failed';
    let statusCode = 500;

    if (error.message.includes('UNIQUE constraint failed')) {
      message = 'Resource already exists';
      statusCode = 409;
    } else if (error.message.includes('FOREIGN KEY constraint failed')) {
      message = 'Referenced resource not found';
      statusCode = 400;
    } else if (error.message.includes('NOT NULL constraint failed')) {
      message = 'Required field is missing';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: 'Database error',
      message,
    });
    return;
  }

  // Handle file system errors
  if (error.code === 'ENOENT') {
    res.status(404).json({
      success: false,
      error: 'File not found',
      message: 'The requested file or directory does not exist',
    });
    return;
  }

  if (error.code === 'EACCES') {
    res.status(403).json({
      success: false,
      error: 'Permission denied',
      message: 'Insufficient permissions to access the resource',
    });
    return;
  }

  // Handle network errors
  if (error.code === 'ECONNREFUSED') {
    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Unable to connect to external service',
    });
    return;
  }

  if (error.code === 'ETIMEDOUT') {
    res.status(504).json({
      success: false,
      error: 'Request timeout',
      message: 'The request took too long to complete',
    });
    return;
  }

  // Handle multer file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: 'File too large',
      message: 'The uploaded file exceeds the maximum allowed size',
    });
    return;
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    res.status(400).json({
      success: false,
      error: 'Too many files',
      message: 'Too many files uploaded at once',
    });
    return;
  }

  // Handle syntax errors (malformed JSON, etc.)
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON',
    });
    return;
  }

  // Default error response
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    success: false,
    error: 'Internal server error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Create standardized API error
 */
export function createApiError(message: string, statusCode: number = 500): ApiError {
  return new ApiError(message, statusCode);
}

/**
 * Validation error helper
 */
export function createValidationError(message: string): ApiError {
  return new ApiError(message, 400);
}

/**
 * Authorization error helper
 */
export function createAuthError(message: string = 'Unauthorized'): ApiError {
  return new ApiError(message, 401);
}

/**
 * Forbidden error helper
 */
export function createForbiddenError(message: string = 'Forbidden'): ApiError {
  return new ApiError(message, 403);
}

/**
 * Not found error helper
 */
export function createNotFoundError(message: string = 'Resource not found'): ApiError {
  return new ApiError(message, 404);
}

/**
 * Conflict error helper
 */
export function createConflictError(message: string = 'Resource already exists'): ApiError {
  return new ApiError(message, 409);
}