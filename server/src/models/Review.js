import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Review must belong to a product'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a star rating between 1 and 5'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer rating value',
      },
    },
    title: {
      type: String,
      required: [true, 'Please provide a review title'],
      trim: true,
      minlength: [2, 'Review title must be at least 2 characters long'],
      maxlength: [120, 'Review title cannot exceed 120 characters'],
    },
    comment: {
      type: String,
      required: [true, 'Please provide a detailed review description'],
      trim: true,
      minlength: [5, 'Review description must be at least 5 characters long'],
      maxlength: [2000, 'Review description cannot exceed 2000 characters'],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['approved', 'rejected', 'pending'],
        message: 'Invalid review status: {VALUE}',
      },
      default: 'approved',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate reviews by the same customer on the same product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Compound indexes for querying and moderation
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
