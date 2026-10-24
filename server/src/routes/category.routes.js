import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public Routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin-Protected Routes
router.post('/', protect, requireAdmin, createCategory);
router.put('/:id', protect, requireAdmin, updateCategory);
router.delete('/:id', protect, requireAdmin, deleteCategory);

export default router;
