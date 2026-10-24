import { Router } from 'express';
import { validateCoupon } from '../controllers/coupon.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Validate coupon route - customer must be authenticated to check user usage limits
router.post('/validate', protect, validateCoupon);

export default router;
