import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSampleCSVTemplate,
  importProductsCSV,
} from '../controllers/product.controller.js';
import {
  getProductReviews,
  createProductReview,
} from '../controllers/review.controller.js';
import { protect, requireAdmin, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public Routes
router.get('/', getProducts);

// Admin-Protected Bulk Import & Sample Template Routes
router.get('/sample-csv', protect, requireAdmin, getSampleCSVTemplate);
router.post('/import-csv', protect, requireAdmin, importProductsCSV);

// Product Reviews Routes
router.get('/:productId/reviews', optionalAuth, getProductReviews);
router.post('/:productId/reviews', protect, createProductReview);

// Single Product route
router.get('/:id', getProductById);

// Admin-Protected CRUD Routes
router.post('/', protect, requireAdmin, createProduct);
router.put('/:id', protect, requireAdmin, updateProduct);
router.delete('/:id', protect, requireAdmin, deleteProduct);

export default router;
