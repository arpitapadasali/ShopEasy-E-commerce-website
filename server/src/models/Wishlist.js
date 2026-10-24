import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Wishlist must belong to a user'],
      unique: true,
      index: true,
    },
    products: [
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

// Virtual for item count in the wishlist
wishlistSchema.virtual('totalItems').get(function () {
  return Array.isArray(this.products) ? this.products.length : 0;
});

const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
