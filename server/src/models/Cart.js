import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Cart item must reference a product'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer quantity',
      },
      default: 1,
    },
  },
  {
    _id: true,
  }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cart must belong to a user'],
      unique: true, // One active cart per user
      index: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for total quantity of items in the cart
cartSchema.virtual('totalItems').get(function () {
  if (!this.items || !Array.isArray(this.items)) return 0;
  return this.items.reduce((total, item) => total + (item.quantity || 0), 0);
});

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

export default Cart;
