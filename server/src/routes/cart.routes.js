import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cart.controller.js';

const router = Router();

// All cart endpoints require an authenticated customer session
router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.delete('/', clearCart);
router.put('/:itemId', updateCartItem);
router.delete('/:itemId', removeFromCart);

export default router;
