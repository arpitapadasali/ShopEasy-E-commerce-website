import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';

/**
 * Protect Middleware
 * Ensures request contains a valid Bearer JWT and sets req.user
 */
export const protect = async (req, res, next) => {
  let token = null;

  // 1. Check for token in Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Reject if no token was found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No authorization token was provided.',
    });
  }

  try {
    // 3. Verify JWT signature and expiration
    const decoded = jwt.verify(token, config.jwtSecret);

    // 4. Fetch the authenticated user (excluding passwordHash)
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // 5. Attach user document to request object
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.',
    });
  }
};

/**
 * Require Admin Middleware
 * Restricts access to users holding the 'admin' role
 * Returns 403 Forbidden if user lacks sufficient privileges
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Administrator privileges required.',
    });
  }
  next();
};

/**
 * Generic Role Authorizer Middleware
 * @param  {...string} roles - Permitted roles (e.g. 'admin', 'moderator')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Role '${req.user?.role || 'anonymous'}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

/**
 * Optional Auth Middleware
 * Inspects token if provided, attaching req.user if valid,
 * but allows unauthenticated visitors to proceed without 401
 */
export const optionalAuth = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const currentUser = await User.findById(decoded.id);
    if (currentUser) {
      req.user = currentUser;
    }
  } catch (_) {
    // Silently continue as guest
  }
  next();
};

export default { protect, requireAdmin, authorizeRoles, optionalAuth };
