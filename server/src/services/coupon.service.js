import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';

/**
 * Validates a coupon code and calculates the discount in integer paise
 * @param {Object} params
 * @param {string} params.couponCode - Raw coupon code entered by customer
 * @param {number} params.subtotalPaise - Server-calculated cart/order subtotal in paise
 * @param {string} params.userId - Authenticated user's ID
 * @param {Array} params.cartItems - Array of cart items (optional, for category/product eligibility)
 * @returns {Promise<Object>} { isValid, coupon, discountPaise, message }
 */
export const validateAndCalculateDiscount = async ({
  couponCode,
  subtotalPaise,
  userId,
  cartItems = [],
}) => {
  if (!couponCode || typeof couponCode !== 'string' || !couponCode.trim()) {
    return {
      isValid: false,
      message: 'Please provide a coupon code.',
      discountPaise: 0,
      coupon: null,
    };
  }

  const cleanCode = couponCode.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: cleanCode });

  if (!coupon) {
    return {
      isValid: false,
      message: `Coupon "${cleanCode}" does not exist.`,
      discountPaise: 0,
      coupon: null,
    };
  }

  // 1. Active Status Check
  if (!coupon.isActive) {
    return {
      isValid: false,
      message: `Coupon "${cleanCode}" is currently inactive or disabled.`,
      discountPaise: 0,
      coupon,
    };
  }

  const now = new Date();

  // 2. Start Date Check
  if (coupon.startDate && now < new Date(coupon.startDate)) {
    return {
      isValid: false,
      message: `Coupon "${cleanCode}" is not valid yet. Valid from ${new Date(coupon.startDate).toLocaleDateString('en-IN')}.`,
      discountPaise: 0,
      coupon,
    };
  }

  // 3. Expiry Date Check
  if (coupon.expiryDate && now > new Date(coupon.expiryDate)) {
    return {
      isValid: false,
      message: `Coupon "${cleanCode}" has expired on ${new Date(coupon.expiryDate).toLocaleDateString('en-IN')}.`,
      discountPaise: 0,
      coupon,
    };
  }

  // 4. Overall Usage Limit Check
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
    if (coupon.usedCount >= coupon.usageLimit) {
      return {
        isValid: false,
        message: `Coupon "${cleanCode}" has reached its maximum global usage limit.`,
        discountPaise: 0,
        coupon,
      };
    }
  }

  // 5. Per-User Usage Limit Check
  if (userId) {
    const userUsageRecord = (coupon.usersUsed || []).find(
      (u) => u.user && u.user.toString() === userId.toString()
    );
    const userCount = userUsageRecord ? userUsageRecord.count : 0;
    const maxPerUser = coupon.userUsageLimit || 1;

    if (userCount >= maxPerUser) {
      return {
        isValid: false,
        message: `You have already redeemed coupon "${cleanCode}" the maximum allowed number of times (${maxPerUser}).`,
        discountPaise: 0,
        coupon,
      };
    }
  }

  // 6. First-Order-Only Check
  if (coupon.firstOrderOnly && userId) {
    const priorOrdersCount = await Order.countDocuments({
      user: userId,
      orderStatus: { $ne: 'cancelled' },
    });

    if (priorOrdersCount > 0) {
      return {
        isValid: false,
        message: `Coupon "${cleanCode}" is only valid on your first order.`,
        discountPaise: 0,
        coupon,
      };
    }
  }

  // 7. Minimum Order Value Check (in paise)
  if (coupon.minOrderAmount > 0 && subtotalPaise < coupon.minOrderAmount) {
    const minRupees = (coupon.minOrderAmount / 100).toFixed(2);
    return {
      isValid: false,
      message: `Coupon "${cleanCode}" requires a minimum order subtotal of ₹${minRupees}. Current subtotal: ₹${(subtotalPaise / 100).toFixed(2)}.`,
      discountPaise: 0,
      coupon,
    };
  }

  // 8. Category & Product Eligibility Checks (if coupon defines restrictions)
  if (cartItems && cartItems.length > 0) {
    if (coupon.eligibleCategories && coupon.eligibleCategories.length > 0) {
      const eligibleCatIds = new Set(coupon.eligibleCategories.map((c) => c.toString()));
      const hasEligibleCategory = cartItems.some((item) => {
        const catId = item.product?.category?._id || item.product?.category;
        return catId && eligibleCatIds.has(catId.toString());
      });

      if (!hasEligibleCategory) {
        return {
          isValid: false,
          message: `Coupon "${cleanCode}" is only applicable to selected product categories.`,
          discountPaise: 0,
          coupon,
        };
      }
    }

    if (coupon.eligibleProducts && coupon.eligibleProducts.length > 0) {
      const eligibleProdIds = new Set(coupon.eligibleProducts.map((p) => p.toString()));
      const hasEligibleProduct = cartItems.some((item) => {
        const prodId = item.product?._id || item.product;
        return prodId && eligibleProdIds.has(prodId.toString());
      });

      if (!hasEligibleProduct) {
        return {
          isValid: false,
          message: `Coupon "${cleanCode}" is only applicable to specific promotional products.`,
          discountPaise: 0,
          coupon,
        };
      }
    }
  }

  // 9. Calculate Discount Amount in Paise
  let discountPaise = 0;
  if (coupon.discountType === 'percentage') {
    discountPaise = Math.round((subtotalPaise * coupon.discountValue) / 100);
    // Apply optional maximum discount ceiling
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
      discountPaise = Math.min(discountPaise, coupon.maxDiscountAmount);
    }
  } else if (coupon.discountType === 'fixed') {
    discountPaise = coupon.discountValue; // Already in paise
  }

  // Security bounds: Discount can never exceed subtotal and cannot be negative
  discountPaise = Math.max(0, Math.min(discountPaise, subtotalPaise));

  return {
    isValid: true,
    message: `Coupon "${coupon.code}" applied successfully! You save ₹${(discountPaise / 100).toFixed(2)}.`,
    discountPaise,
    coupon,
  };
};

/**
 * Atomically records coupon usage when an order is finalized
 * Prevents race condition over-redemption using conditional update
 */
export const recordCouponUsage = async ({ couponId, userId }) => {
  if (!couponId) return;

  // 1. Fetch current coupon state
  const coupon = await Coupon.findById(couponId);
  if (!coupon) return;

  // 2. Check if user already exists in usersUsed
  const userIdx = (coupon.usersUsed || []).findIndex(
    (u) => u.user && u.user.toString() === userId.toString()
  );

  if (userIdx > -1) {
    // Increment existing user count and total count
    await Coupon.findOneAndUpdate(
      {
        _id: couponId,
        $or: [
          { usageLimit: null },
          { usedCount: { $lt: coupon.usageLimit } },
        ],
      },
      {
        $inc: {
          usedCount: 1,
          [`usersUsed.${userIdx}.count`]: 1,
        },
      }
    );
  } else {
    // Push new user entry and increment total count
    await Coupon.findOneAndUpdate(
      {
        _id: couponId,
        $or: [
          { usageLimit: null },
          { usedCount: { $lt: coupon.usageLimit } },
        ],
      },
      {
        $inc: { usedCount: 1 },
        $push: { usersUsed: { user: userId, count: 1 } },
      }
    );
  }
};

/**
 * Safely releases coupon usage if an order is cancelled
 */
export const releaseCouponUsage = async ({ couponId, userId }) => {
  if (!couponId) return;

  const coupon = await Coupon.findById(couponId);
  if (!coupon) return;

  const userIdx = (coupon.usersUsed || []).findIndex(
    (u) => u.user && u.user.toString() === userId.toString()
  );

  const updateOps = {
    $inc: { usedCount: -1 },
  };

  if (userIdx > -1 && coupon.usersUsed[userIdx].count > 0) {
    updateOps.$inc[`usersUsed.${userIdx}.count`] = -1;
  }

  await Coupon.findByIdAndUpdate(couponId, updateOps);
};

export default {
  validateAndCalculateDiscount,
  recordCouponUsage,
  releaseCouponUsage,
};
