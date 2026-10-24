import Coupon from '../models/Coupon.js';
import { validateAndCalculateDiscount } from '../services/coupon.service.js';
import { escapeRegex } from '../utils/helpers.js';

/**
 * POST /api/coupons/validate
 * Customer endpoint to validate a coupon against their active cart subtotal.
 */
export const validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Coupon code is required.',
      });
    }

    // Ensure subtotal is an integer in paise
    const parsedSubtotal = parseInt(subtotal, 10);
    if (isNaN(parsedSubtotal) || parsedSubtotal < 0) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Valid order subtotal in paise is required.',
      });
    }

    const userId = req.user?._id;

    const result = await validateAndCalculateDiscount({
      couponCode: code,
      subtotalPaise: parsedSubtotal,
      userId,
    });

    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      message: result.message,
      coupon: {
        _id: result.coupon._id,
        code: result.coupon.code,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
        minOrderAmount: result.coupon.minOrderAmount,
        maxDiscountAmount: result.coupon.maxDiscountAmount,
      },
      discount: result.discountPaise,
      discountInRupees: (result.discountPaise / 100).toFixed(2),
      subtotal: parsedSubtotal,
      newTotal: Math.max(0, parsedSubtotal - result.discountPaise),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/coupons
 * Admin endpoint: List all coupons with search, status filtering, and pagination.
 */
export const getAdminCoupons = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    if (search && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { code: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Coupon.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: coupons.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      coupons,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/admin/coupons
 * Admin endpoint: Create a new promotional coupon.
 */
export const createAdminCoupon = async (req, res, next) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      expiryDate,
      isActive = true,
      usageLimit,
      userUsageLimit = 1,
      firstOrderOnly = false,
      eligibleCategories,
      eligibleProducts,
    } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code must be at least 3 characters long.',
      });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check unique code
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A coupon with code "${cleanCode}" already exists.`,
      });
    }

    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: 'Discount type must be either "percentage" or "fixed".',
      });
    }

    const numValue = parseInt(discountValue, 10);
    if (isNaN(numValue) || numValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount value must be a positive integer.',
      });
    }

    if (discountType === 'percentage' && (numValue < 1 || numValue > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount must be between 1% and 100%.',
      });
    }

    if (!expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date is required.',
      });
    }

    const parsedExpiry = new Date(expiryDate);
    if (isNaN(parsedExpiry.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expiry date format.',
      });
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      description: (description || '').trim(),
      discountType,
      discountValue: numValue,
      minOrderAmount: minOrderAmount ? Math.max(0, parseInt(minOrderAmount, 10)) : 0,
      maxDiscountAmount: maxDiscountAmount ? parseInt(maxDiscountAmount, 10) : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      expiryDate: parsedExpiry,
      isActive: Boolean(isActive),
      usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
      userUsageLimit: userUsageLimit ? Math.max(1, parseInt(userUsageLimit, 10)) : 1,
      firstOrderOnly: Boolean(firstOrderOnly),
      eligibleCategories: Array.isArray(eligibleCategories) ? eligibleCategories : [],
      eligibleProducts: Array.isArray(eligibleProducts) ? eligibleProducts : [],
    });

    return res.status(201).json({
      success: true,
      message: `Coupon "${coupon.code}" created successfully.`,
      coupon,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/coupons/:id
 * Admin endpoint: Retrieve a single coupon by ID.
 */
export const getAdminCouponById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    return res.status(200).json({
      success: true,
      coupon,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/admin/coupons/:id
 * Admin endpoint: Update an existing coupon.
 */
export const updateAdminCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    const allowedUpdates = [
      'description',
      'discountType',
      'discountValue',
      'minOrderAmount',
      'maxDiscountAmount',
      'startDate',
      'expiryDate',
      'isActive',
      'usageLimit',
      'userUsageLimit',
      'firstOrderOnly',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        coupon[field] = req.body[field];
      }
    });

    if (req.body.code && req.body.code.trim().toUpperCase() !== coupon.code) {
      const cleanCode = req.body.code.trim().toUpperCase();
      const existing = await Coupon.findOne({ code: cleanCode, _id: { $ne: coupon._id } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Coupon code "${cleanCode}" is already in use by another coupon.`,
        });
      }
      coupon.code = cleanCode;
    }

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon "${coupon.code}" updated successfully.`,
      coupon,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/admin/coupons/:id/toggle
 * Admin endpoint: Toggle active status of a coupon.
 */
export const toggleAdminCouponStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon "${coupon.code}" is now ${coupon.isActive ? 'Active' : 'Inactive'}.`,
      coupon,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/coupons/:id
 * Admin endpoint: Delete coupon.
 */
export const deleteAdminCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.',
      });
    }

    await Coupon.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Coupon "${coupon.code}" has been permanently deleted.`,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  validateCoupon,
  getAdminCoupons,
  createAdminCoupon,
  getAdminCouponById,
  updateAdminCoupon,
  toggleAdminCouponStatus,
  deleteAdminCoupon,
};
