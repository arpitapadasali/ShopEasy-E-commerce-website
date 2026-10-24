import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { slugify } from '../utils/helpers.js';

/**
 * @desc    Get all active categories
 * @route   GET /api/categories
 * @access  Public
 */
export const getCategories = async (req, res, next) => {
  try {
    const filter = {};

    // Only include inactive if explicit admin query
    if (req.query.includeInactive !== 'true' || req.user?.role !== 'admin') {
      filter.isActive = true;
    }

    const categories = await Category.find(filter).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category by ID or slug
 * @route   GET /api/categories/:id
 * @access  Public
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let category;
    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id);
    } else {
      category = await Category.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, imageUrl, isActive } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required and must be at least 2 characters long.',
      });
    }

    const trimmedName = name.trim();
    const slug = slugify(trimmedName);

    // Check for existing slug or name
    const existing = await Category.findOne({
      $or: [{ name: trimmedName }, { slug }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name or slug already exists.',
      });
    }

    const category = await Category.create({
      name: trimmedName,
      slug,
      description: description?.trim() || '',
      imageUrl: imageUrl?.trim() || '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format.',
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    const { name, description, imageUrl, isActive } = req.body;

    if (name) {
      const trimmedName = name.trim();
      const newSlug = slugify(trimmedName);

      // Check if new name or slug conflicts with another category
      const conflict = await Category.findOne({
        _id: { $ne: id },
        $or: [{ name: trimmedName }, { slug: newSlug }],
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Another category with this name already exists.',
        });
      }

      category.name = trimmedName;
      category.slug = newSlug;
    }

    if (description !== undefined) category.description = description.trim();
    if (imageUrl !== undefined) category.imageUrl = imageUrl.trim();
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    const updatedCategory = await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      category: updatedCategory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format.',
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    // Safety check: prevent deleting category if products reference it
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${productCount} product(s) are currently assigned to it. Please reassign or delete these products first.`,
      });
    }

    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
