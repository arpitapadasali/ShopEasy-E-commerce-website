import { config } from '../config/env.js';

/**
 * 404 Not Found Middleware
 * Catches any unhandled request paths and forwards a 404 error
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized Error Handler Middleware
 * Normalizes all uncaught errors into consistent JSON responses
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : (err.status || 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || undefined,
    stack: config.isProduction ? undefined : err.stack,
  });
};
