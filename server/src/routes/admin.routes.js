import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';
import {
  getAdminStats,
  getAdminProducts,
  getAdminCategories,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  getAdminCustomers,
} from '../controllers/admin.controller.js';
import { getSampleCSVTemplate, importProductsCSV } from '../controllers/product.controller.js';
import {
  getAdminCoupons,
  createAdminCoupon,
  getAdminCouponById,
  updateAdminCoupon,
  toggleAdminCouponStatus,
  deleteAdminCoupon,
} from '../controllers/coupon.controller.js';
import {
  getAdminReviews,
  moderateReview,
  deleteReview as deleteAdminReview,
} from '../controllers/review.controller.js';

const router = Router();

// Enforce authentication AND administrator role verification on all admin routes
router.use(protect);
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/products/sample-csv', getSampleCSVTemplate);
router.post('/products/import-csv', importProductsCSV);
router.get('/products', getAdminProducts);
router.get('/categories', getAdminCategories);
router.get('/orders', getAdminOrders);
router.get('/orders/:id', getAdminOrderById);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/customers', getAdminCustomers);

// Coupon Administration Routes
router.get('/coupons', getAdminCoupons);
router.post('/coupons', createAdminCoupon);
router.get('/coupons/:id', getAdminCouponById);
router.put('/coupons/:id', updateAdminCoupon);
router.patch('/coupons/:id/toggle', toggleAdminCouponStatus);
router.delete('/coupons/:id', deleteAdminCoupon);

// Review Administration & Moderation Routes
router.get('/reviews', getAdminReviews);
router.patch('/reviews/:reviewId/moderation', moderateReview);
router.delete('/reviews/:reviewId', deleteAdminReview);

export default router;
