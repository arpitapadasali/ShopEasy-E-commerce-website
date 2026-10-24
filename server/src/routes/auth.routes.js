import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
} from '../controllers/auth.controller.js';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
} from '../middleware/validator.middleware.js';

const router = Router();

// Public Authentication Routes (Rate-limited & Validated)
router.post('/register', authLimiter, validateRegistration, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/logout', logout);

// Protected User Routes (Require valid Bearer JWT)
router.get('/me', protect, getMe);
router.put('/profile', protect, validateProfileUpdate, updateProfile);

// Admin-Only Verification Endpoint (Used to test role-based 403 access control)
router.get('/admin-only', protect, requireAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: You have accessed the administrator-only resource.',
    admin: req.user.toJSON(),
  });
});

export default router;
