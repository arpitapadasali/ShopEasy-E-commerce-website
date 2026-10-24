import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
  verifyPayment,
} from '../controllers/order.controller.js';

const router = Router();

// All order endpoints require an authenticated user session
router.use(protect);

router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.get('/:id/invoice', downloadInvoice);
router.patch('/:id/cancel', cancelOrder);
router.post('/:id/verify-payment', verifyPayment);

export default router;
