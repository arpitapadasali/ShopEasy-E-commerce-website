import mongoose from 'mongoose';

const userUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer usage count',
      },
    },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please provide coupon code'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Coupon code must be at least 3 characters long'],
      maxlength: [30, 'Coupon code cannot exceed 30 characters'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    discountType: {
      type: String,
      enum: {
        values: ['percentage', 'fixed'],
        message: 'Discount type must be either percentage or fixed',
      },
      required: [true, 'Please specify discount type (percentage or fixed)'],
    },
    /**
     * discountValue:
     * - If discountType is 'percentage': integer percentage from 1 to 100
     * - If discountType is 'fixed': integer discount amount in paise (1 INR = 100 paise)
     */
    discountValue: {
      type: Number,
      required: [true, 'Please specify discount value'],
      min: [1, 'Discount value must be at least 1'],
      validate: {
        validator: function (v) {
          if (!Number.isInteger(v)) return false;
          if (this.discountType === 'percentage') {
            return v >= 1 && v <= 100;
          }
          return v > 0;
        },
        message: 'Invalid discount value for the specified discount type',
      },
    },
    /**
     * Minimum order subtotal required to use this coupon (in paise)
     */
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    /**
     * Optional maximum discount cap for percentage discounts (in paise)
     */
    maxDiscountAmount: {
      type: Number,
      default: null,
      validate: {
        validator: function (v) {
          return v === null || (Number.isInteger(v) && v > 0);
        },
        message: 'Max discount amount must be a positive integer in paise or null',
      },
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please provide coupon expiry date'],
      validate: {
        validator: function (v) {
          return !this.startDate || v > this.startDate;
        },
        message: 'Expiry date must be after start date',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    /**
     * Overall redemptions limit across all customers (null = unlimited)
     */
    usageLimit: {
      type: Number,
      default: null,
      validate: {
        validator: function (v) {
          return v === null || (Number.isInteger(v) && v > 0);
        },
        message: 'Usage limit must be a positive integer or null',
      },
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer count',
      },
    },
    /**
     * Maximum times a single user can redeem this coupon
     */
    userUsageLimit: {
      type: Number,
      default: 1,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer user usage limit',
      },
    },
    usersUsed: [userUsageSchema],
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    eligibleCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    eligibleProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for remaining uses
couponSchema.virtual('remainingUses').get(function () {
  if (this.usageLimit === null || this.usageLimit === undefined) return null;
  return Math.max(0, this.usageLimit - (this.usedCount || 0));
});

// Virtual for formatted value display
couponSchema.virtual('formattedValue').get(function () {
  if (this.discountType === 'percentage') {
    return `${this.discountValue}% OFF`;
  }
  return `₹${(this.discountValue / 100).toFixed(2)} OFF`;
});

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

export default Coupon;
