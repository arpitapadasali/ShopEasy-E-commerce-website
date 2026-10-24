import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

/**
 * Helper to calculate cart totals and clean up any inactive or deleted products.
 * Calculates all prices and totals strictly on the server using integer paise.
 */
const formatAndSyncCart = async (cart) => {
  let subtotal = 0;
  let totalItems = 0;
  const validItems = [];
  let needsSave = false;

  const originalLength = cart.items.length;
  const filteredItems = [];

  for (const item of cart.items) {
    // If the referenced product was removed from the database or deactivated
    if (!item.product || item.product.isActive === false) {
      needsSave = true;
      continue;
    }

    filteredItems.push(item);
    const itemTotal = item.product.price * item.quantity;
    subtotal += itemTotal;
    totalItems += item.quantity;

    validItems.push({
      _id: item._id,
      product: {
        _id: item.product._id,
        name: item.product.name,
        slug: item.product.slug,
        price: item.product.price,
        stock: item.product.stock,
        imageUrl: item.product.imageUrl,
        isActive: item.product.isActive,
      },
      quantity: item.quantity,
      itemTotal,
    });
  }

  // If any invalid or deactivated items were filtered out, update database document
  if (needsSave || filteredItems.length !== originalLength) {
    cart.items = filteredItems;
    await cart.save();
  }

  return {
    _id: cart._id,
    user: cart.user,
    items: validItems,
    totalItems,
    subtotal,
    updatedAt: cart.updatedAt,
  };
};

/**
 * GET /api/cart
 * Retrieves the authenticated user's cart with server-calculated totals.
 */
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'name slug price stock imageUrl isActive'
    );

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const formattedCart = await formatAndSyncCart(cart);

    return res.status(200).json({
      success: true,
      cart: formattedCart,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/cart
 * Adds a product to the authenticated user's cart or increments quantity.
 * Body: { productId, quantity }
 */
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // 1. Validate Product ID format
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid product ID is required.',
      });
    }

    // 2. Validate quantity: must be an integer >= 1
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive whole integer (minimum 1).',
      });
    }

    // 3. Fetch product from database to verify existence, active status, and current stock
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or is currently unavailable.',
      });
    }

    // 4. Verify product has stock available
    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: `Product "${product.name}" is currently out of stock.`,
      });
    }

    // 5. Find or create cart for user
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // 6. Check if product is already in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    let targetQuantity = qty;
    if (existingItemIndex > -1) {
      targetQuantity = cart.items[existingItemIndex].quantity + qty;
    }

    // 7. Check if total requested quantity exceeds available stock
    if (targetQuantity > product.stock) {
      const currentInCart = existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0;
      return res.status(400).json({
        success: false,
        message: `Cannot add ${qty} more unit(s). Only ${product.stock} units available in stock (you already have ${currentInCart} in your cart).`,
      });
    }

    // 8. Update or push item
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = targetQuantity;
    } else {
      cart.items.push({
        product: product._id,
        quantity: qty,
      });
    }

    await cart.save();

    // 9. Re-populate and format response
    const populatedCart = await Cart.findById(cart._id).populate(
      'items.product',
      'name slug price stock imageUrl isActive'
    );
    const formattedCart = await formatAndSyncCart(populatedCart);

    return res.status(200).json({
      success: true,
      message: `Added ${product.name} to cart.`,
      cart: formattedCart,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/cart/:itemId
 * Updates the quantity of a specific item in the cart.
 * Param: itemId (can be cart item _id or product _id)
 * Body: { quantity }
 */
export const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Cart item ID is required.',
      });
    }

    // Validate quantity: integer >= 1
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive whole integer (minimum 1).',
      });
    }

    // Find user's cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found.',
      });
    }

    // Find the item by cartItem _id or product id
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId || item.product.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in your shopping cart.',
      });
    }

    const targetItem = cart.items[itemIndex];
    const product = await Product.findById(targetItem.product);

    if (!product || !product.isActive) {
      // Remove stale item if product no longer exists or is inactive
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return res.status(400).json({
        success: false,
        message: 'This product is no longer active and has been removed from your cart.',
      });
    }

    // Check stock limit
    if (qty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot set quantity to ${qty}. Maximum available stock is ${product.stock}.`,
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = qty;
    await cart.save();

    // Return populated and recalculated cart
    const populatedCart = await Cart.findById(cart._id).populate(
      'items.product',
      'name slug price stock imageUrl isActive'
    );
    const formattedCart = await formatAndSyncCart(populatedCart);

    return res.status(200).json({
      success: true,
      message: 'Cart item updated successfully.',
      cart: formattedCart,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/cart/:itemId
 * Removes an item from the cart.
 * Param: itemId (can be cart item _id or product _id)
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Cart item ID is required.',
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found.',
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId || item.product.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in your shopping cart.',
      });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate(
      'items.product',
      'name slug price stock imageUrl isActive'
    );
    const formattedCart = await formatAndSyncCart(populatedCart);

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      cart: formattedCart,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/cart
 * Clears all items from the authenticated user's cart.
 */
export const clearCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    } else {
      cart.items = [];
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
      cart: {
        _id: cart._id,
        user: cart.user,
        items: [],
        totalItems: 0,
        subtotal: 0,
        updatedAt: cart.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};
