import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

/**
 * Recalculates and updates average rating and review count on the Product document.
 * Only reviews with status === 'approved' contribute to the active public rating.
 *
 * @param {string|mongoose.Types.ObjectId} productId
 * @returns {Promise<{ rating: number, numReviews: number }>}
 */
export const updateProductRatingStats = async (productId) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return { rating: 0, numReviews: 0 };
  }

  const prodObjectId = new mongoose.Types.ObjectId(productId);

  const stats = await Review.aggregate([
    {
      $match: {
        product: prodObjectId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  let rating = 0;
  let numReviews = 0;

  if (stats.length > 0) {
    // Round to 1 decimal place (e.g., 4.3333 -> 4.3)
    rating = Math.round(stats[0].avgRating * 10) / 10;
    numReviews = stats[0].numReviews;
  }

  await Product.findByIdAndUpdate(prodObjectId, {
    rating,
    numReviews,
  });

  return { rating, numReviews };
};

/**
 * Computes 1-star through 5-star distribution and percentages for a product.
 *
 * @param {string|mongoose.Types.ObjectId} productId
 * @returns {Promise<Object>} Distribution summary with counts and percentages
 */
export const getRatingDistribution = async (productId) => {
  const prodObjectId = new mongoose.Types.ObjectId(productId);

  const distributionAggregate = await Review.aggregate([
    {
      $match: {
        product: prodObjectId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
  ]);

  const rawMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  distributionAggregate.forEach((item) => {
    if (item._id >= 1 && item._id <= 5) {
      rawMap[item._id] = item.count;
      total += item.count;
    }
  });

  const breakdown = {};
  for (let star = 5; star >= 1; star--) {
    const count = rawMap[star];
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    breakdown[star] = {
      count,
      percentage,
    };
  }

  return {
    total,
    breakdown,
  };
};

/**
 * Determines whether a customer has an actual non-cancelled purchase history for this product.
 * Grounded strictly in database Order records.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string|mongoose.Types.ObjectId} productId
 * @returns {Promise<boolean>}
 */
export const checkVerifiedPurchase = async (userId, productId) => {
  if (!userId || !productId) return false;

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const prodObjectId = new mongoose.Types.ObjectId(productId);

    const qualifyingOrder = await Order.findOne({
      user: userObjectId,
      orderStatus: { $ne: 'cancelled' },
      'items.product': prodObjectId,
    }).lean();

    return Boolean(qualifyingOrder);
  } catch (error) {
    console.error('[ReviewService] Error checking purchase verification:', error);
    return false;
  }
};

export default {
  updateProductRatingStats,
  getRatingDistribution,
  checkVerifiedPurchase,
};
