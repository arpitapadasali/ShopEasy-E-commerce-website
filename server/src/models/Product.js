import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters long'],
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Please provide product slug'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide product description'],
      trim: true,
    },
    /**
     * Price stored as an INTEGER IN PAISE (1 INR = 100 Paise)
     * Avoids IEEE 754 floating point precision drift during calculations.
     * Example: ₹499.00 -> 49900 paise
     */
    price: {
      type: Number,
      required: [true, 'Please provide product price in paise'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for price in paise',
      },
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please specify product category'],
      index: true,
    },
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer stock value',
      },
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    discount: {
      type: Number,
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100%'],
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    numReviews: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer review count',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property to expose price formatted in Rupees for display
productSchema.virtual('priceInRupees').get(function () {
  return typeof this.price === 'number' ? (this.price / 100).toFixed(2) : '0.00';
});

// Virtual property for discounted price in Paise
productSchema.virtual('discountedPrice').get(function () {
  if (typeof this.price !== 'number') return 0;
  if (!this.discount || this.discount <= 0) return this.price;
  return Math.round(this.price * (1 - this.discount / 100));
});

// Virtual property for discounted price in Rupees
productSchema.virtual('discountedPriceInRupees').get(function () {
  const dPrice = this.discountedPrice;
  return (dPrice / 100).toFixed(2);
});

// Virtual property alias for productName to guarantee 100% interoperability with CSV-imported fields
productSchema.virtual('productName').get(function () {
  return this.name;
});

// Sync name and productName if either is populated
productSchema.pre('validate', function (next) {
  if (!this.name && this.productName) {
    this.name = this.productName;
  }
  next();
});

// Compound and unique indexes for performant catalog queries
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ featured: 1, isActive: 1 });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ rating: -1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
