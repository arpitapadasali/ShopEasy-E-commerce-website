import mongoose from 'mongoose';

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Order item must reference a product'],
    },
    name: {
      type: String,
      required: [true, 'Snapshot product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      default: '',
    },
    sku: {
      type: String,
      default: '',
      trim: true,
    },
    /**
     * Snapshot price per unit in paise at time of purchase
     */
    price: {
      type: Number,
      required: [true, 'Snapshot unit price in paise is required'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise price',
      },
    },
    imageUrl: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer quantity',
      },
    },
    /**
     * Calculated item subtotal in paise (price * quantity)
     */
    subtotal: {
      type: Number,
      required: [true, 'Item subtotal in paise is required'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer subtotal',
      },
    },
  },
  { _id: true }
);

const shippingDetailsSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Shipping recipient full name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Shipping street address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Shipping city is required'],
      trim: true,
    },
    pinCode: {
      type: String,
      required: [true, 'Shipping postal/pin code is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Shipping contact phone is required'],
      trim: true,
    },
  },
  { _id: false }
);

const orderTotalsSchema = new mongoose.Schema(
  {
    /**
     * Sum of item subtotals in paise
     */
    itemsTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    /**
     * Shipping charges in paise
     */
    shippingFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    /**
     * Applicable tax in paise
     */
    tax: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    /**
     * Coupon discount in paise (subtracted from itemsTotal)
     */
    discount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    /**
     * Final payable grand total in paise (itemsTotal - discount + shippingFee + tax)
     */
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user'],
      index: true,
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    items: {
      type: [orderItemSnapshotSchema],
      validate: [
        (items) => items && items.length > 0,
        'An order must contain at least one item snapshot',
      ],
    },
    shippingDetails: {
      type: shippingDetailsSchema,
      required: [true, 'Shipping details are required'],
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['cod', 'card', 'upi', 'netbanking'],
        message: 'Invalid payment method: {VALUE}',
      },
      default: 'cod',
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'failed', 'refunded'],
        message: 'Invalid payment status: {VALUE}',
      },
      default: 'pending',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: {
        values: ['placed', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        message: 'Invalid order status: {VALUE}',
      },
      default: 'placed',
      index: true,
    },
    totals: {
      type: orderTotalsSchema,
      required: [true, 'Order totals breakdown is required'],
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
    couponCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: '',
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    invoiceDate: {
      type: Date,
      default: null,
    },
    notificationsSent: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals to view totals in Rupees
orderSchema.virtual('grandTotalInRupees').get(function () {
  return typeof this.totals?.grandTotal === 'number'
    ? (this.totals.grandTotal / 100).toFixed(2)
    : '0.00';
});

// Indexes for order history queries
orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
