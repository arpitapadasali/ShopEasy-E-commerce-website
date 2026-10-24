import { Router } from 'express';
import { updateReview, deleteReview } from '../controllers/review.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Customer endpoints to edit or delete their own review
router.put('/:reviewId', protect, updateReview);
router.delete('/:reviewId', protect, deleteReview);

export default router;
