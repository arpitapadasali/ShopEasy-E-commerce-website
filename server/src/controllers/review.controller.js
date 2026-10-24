import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import {
  updateProductRatingStats,
  getRatingDistribution,
  checkVerifiedPurchase,
} from '../services/review.service.js';
import { escapeRegex } from '../utils/helpers.js';

/**
 * GET /api/products/:productId/reviews
 * Public endpoint to retrieve approved reviews, rating breakdown, and user review status.
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const { page = 1, limit = 10, rating } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      product: product._id,
      status: 'approved',
    };

    if (rating && [1, 2, 3, 4, 5].includes(parseInt(rating, 10))) {
      filter.rating = parseInt(rating, 10);
    }

    const [reviews, totalCount, distributionData] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(filter),
      getRatingDistribution(product._id),
    ]);

    // Check if the requesting user has already reviewed or has verified purchase eligibility
    let userReviewStatus = {
      hasReviewed: false,
      userReview: null,
      isVerifiedPurchaser: false,
    };

    if (req.user) {
      const existingUserReview = await Review.findOne({
        product: product._id,
        user: req.user._id,
      }).lean();

      const isVerified = await checkVerifiedPurchase(req.user._id, product._id);

      userReviewStatus = {
        hasReviewed: Boolean(existingUserReview),
        userReview: existingUserReview || null,
        isVerifiedPurchaser: isVerified,
      };
    }

    return res.status(200).json({
      success: true,
      productId: product._id,
      ratingSummary: {
        averageRating: product.rating || 0,
        totalReviews: product.numReviews || 0,
        distribution: distributionData.breakdown,
      },
      stats: {
        rating: product.rating || 0,
        numReviews: product.numReviews || 0,
        distribution: distributionData.breakdown,
      },
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum) || 1,
      },
      userReviewStatus,
      userHasReviewed: userReviewStatus.hasReviewed,
      userReview: userReviewStatus.userReview,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/products/:productId/reviews
 * Customer endpoint to submit a new product review.
 */
export const createProductReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unavailable.',
      });
    }

    // 1. Rating validation
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5 stars.',
      });
    }

    // 2. Title validation
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Review title is required (minimum 2 characters).',
      });
    }

    if (title.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Review title cannot exceed 120 characters.',
      });
    }

    // 3. Comment validation
    if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Review description is required (minimum 5 characters).',
      });
    }

    if (comment.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Review description cannot exceed 2000 characters.',
      });
    }

    // 4. Duplicate prevention
    const existing = await Review.findOne({
      product: product._id,
      user: req.user._id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this product. You can edit your existing review.',
      });
    }

    // 5. Check actual verified purchase status in orders
    const isVerifiedPurchase = await checkVerifiedPurchase(req.user._id, product._id);

    // 6. Create Review
    const review = await Review.create({
      product: product._id,
      user: req.user._id,
      rating: numRating,
      title: title.trim(),
      comment: comment.trim(),
      isVerifiedPurchase,
      status: 'approved',
    });

    // 7. Update Product average rating and review count
    const updatedStats = await updateProductRatingStats(product._id);

    await review.populate('user', 'name');

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully! Thank you for your feedback.',
      review,
      productRating: updatedStats.rating,
      productNumReviews: updatedStats.numReviews,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this product.',
      });
    }
    return next(error);
  }
};

/**
 * PUT /api/reviews/:reviewId
 * Customer endpoint to update their own review.
 */
export const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID.',
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    // Ownership check: only review author or admin can update
    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to edit this review.',
      });
    }

    // Validation
    if (rating !== undefined) {
      const numRating = parseInt(rating, 10);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5 stars.',
        });
      }
      review.rating = numRating;
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Review title must be at least 2 characters long.',
        });
      }
      if (title.trim().length > 120) {
        return res.status(400).json({
          success: false,
          message: 'Review title cannot exceed 120 characters.',
        });
      }
      review.title = title.trim();
    }

    if (comment !== undefined) {
      if (typeof comment !== 'string' || comment.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Review description must be at least 5 characters long.',
        });
      }
      if (comment.trim().length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Review description cannot exceed 2000 characters.',
        });
      }
      review.comment = comment.trim();
    }

    await review.save();

    // Recalculate stats
    const updatedStats = await updateProductRatingStats(review.product);
    await review.populate('user', 'name');

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully.',
      review,
      productRating: updatedStats.rating,
      productNumReviews: updatedStats.numReviews,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/reviews/:reviewId
 * Customer or Admin endpoint to delete a review.
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID.',
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to delete this review.',
      });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);

    // Recalculate stats
    const updatedStats = await updateProductRatingStats(productId);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully.',
      productRating: updatedStats.rating,
      productNumReviews: updatedStats.numReviews,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/reviews
 * Admin endpoint: List all reviews with search, product filter, rating filter, and status filter.
 */
export const getAdminReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, product, rating, status, search } = req.query;

    const query = {};

    if (product && mongoose.Types.ObjectId.isValid(product)) {
      query.product = product;
    }

    if (rating && [1, 2, 3, 4, 5].includes(parseInt(rating, 10))) {
      query.rating = parseInt(rating, 10);
    }

    if (status && ['approved', 'rejected', 'pending'].includes(status)) {
      query.status = status;
    }

    if (search && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { comment: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('product', 'name imageUrl price')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      reviews,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/admin/reviews/:reviewId/moderation
 * Admin endpoint: Update review moderation status (approved | rejected | pending).
 */
export const moderateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID.',
      });
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid moderation status. Allowed: "approved", "rejected", "pending".',
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    review.status = status;
    await review.save();

    // Recalculate product rating stats as only approved reviews count
    const updatedStats = await updateProductRatingStats(review.product);
    await review.populate('product', 'name');
    await review.populate('user', 'name email');

    return res.status(200).json({
      success: true,
      message: `Review moderation status updated to '${status}'.`,
      review,
      productRating: updatedStats.rating,
      productNumReviews: updatedStats.numReviews,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getProductReviews,
  createProductReview,
  updateReview,
  deleteReview,
  getAdminReviews,
  moderateReview,
};
