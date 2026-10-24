import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import {
  validateAndCalculateDiscount,
  recordCouponUsage,
  releaseCouponUsage,
} from '../services/coupon.service.js';
import {
  sendOrderConfirmationEmail,
  sendPaymentVerificationEmail,
  sendOrderCancellationEmail,
} from '../services/email.service.js';
import {
  sendOrderConfirmationSMS,
  sendPaymentVerifiedSMS,
  sendOrderStatusSMS,
} from '../services/sms.service.js';
import {
  generateInvoicePDF,
  generateInvoiceNumber,
} from '../services/invoice.service.js';

/**
 * Generate a clean, unique order number
 * Format: SE-YYYYMMDD-XXXX (e.g. SE-20261017-8392)
 */
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `SE-${dateStr}-${randomSuffix}`;
};

/**
 * POST /api/orders
 * Creates an order using Cash on Delivery (COD) only.
 * Validates shipping details, checks current stock and prices,
 * validates and applies coupons safely on the server,
 * deducts stock safely, creates order snapshot, and clears the user's cart.
 */
export const createOrder = async (req, res, next) => {
  const { shippingDetails, paymentMethod = 'cod', couponCode = '' } = req.body;

  // 1. Validate payment method: only Cash on Delivery (cod) is supported in this stage
  if (paymentMethod !== 'cod') {
    return res.status(400).json({
      success: false,
      message: 'Only Cash on Delivery (cod) is supported as the payment method.',
    });
  }

  // 2. Validate shipping details
  if (!shippingDetails || typeof shippingDetails !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Shipping details are required.',
    });
  }

  const { fullName, phone, address, city, pinCode } = shippingDetails;

  const errors = [];
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push('Full name is required (minimum 2 characters).');
  }
  if (!phone || typeof phone !== 'string' || !/^\+?[0-9\s\-()]{10,15}$/.test(phone.trim())) {
    errors.push('A valid 10-15 digit phone number is required.');
  }
  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    errors.push('Street address is required (minimum 5 characters).');
  }
  if (!city || typeof city !== 'string' || city.trim().length < 2) {
    errors.push('City is required (minimum 2 characters).');
  }
  if (!pinCode || typeof pinCode !== 'string' || !/^\d{4,10}$/.test(pinCode.trim())) {
    errors.push('A valid postal / PIN code is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed for shipping details.',
      errors,
    });
  }

  // 3. Retrieve user's cart from MongoDB
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Your shopping cart is empty. Add items to your cart before checking out.',
    });
  }

  // 4. Fetch current product details from database & verify active status, prices, and stock
  const productIds = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const itemSnapshots = [];
  let calculatedItemsTotal = 0;

  for (const cartItem of cart.items) {
    const product = productMap.get(cartItem.product.toString());

    if (!product || !product.isActive) {
      return res.status(400).json({
        success: false,
        message: `Product "${product?.name || cartItem.product}" is unavailable or no longer active. Please update your cart.`,
      });
    }

    if (cartItem.quantity < 1 || !Number.isInteger(cartItem.quantity)) {
      return res.status(400).json({
        success: false,
        message: `Invalid quantity for product "${product.name}".`,
      });
    }

    if (product.stock < cartItem.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for "${product.name}". Requested: ${cartItem.quantity}, Available: ${product.stock}.`,
      });
    }

    const itemSubtotal = product.price * cartItem.quantity;
    calculatedItemsTotal += itemSubtotal;

    itemSnapshots.push({
      product: product._id,
      name: product.name,
      slug: product.slug,
      sku: product.sku || '',
      price: product.price, // Integer paise
      imageUrl: product.imageUrl,
      quantity: cartItem.quantity,
      subtotal: itemSubtotal,
    });
  }

  if (itemSnapshots.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid products in cart to order.',
    });
  }

  // 5. Coupon validation and discount calculation on server
  let appliedCoupon = null;
  let discountPaise = 0;

  if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
    const couponValidation = await validateAndCalculateDiscount({
      couponCode: couponCode.trim(),
      subtotalPaise: calculatedItemsTotal,
      userId: req.user._id,
      cartItems: cart.items.map((ci) => ({
        ...ci.toObject(),
        product: productMap.get(ci.product.toString()),
      })),
    });

    if (!couponValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: couponValidation.message,
      });
    }

    appliedCoupon = couponValidation.coupon;
    discountPaise = couponValidation.discountPaise;
  }

  const totals = {
    itemsTotal: calculatedItemsTotal,
    discount: discountPaise,
    shippingFee: 0, // Free shipping
    tax: 0, // Inclusive of taxes
    grandTotal: Math.max(0, calculatedItemsTotal - discountPaise),
  };

  const orderNumber = generateOrderNumber();
  const invoiceNumber = generateInvoiceNumber();
  const invoiceDate = new Date();

  // 6. Stock deduction and Order Creation Strategy:
  let session = null;
  let useTransactions = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransactions = true;
  } catch (err) {
    session = null;
    useTransactions = false;
  }

  const postOrderSuccess = async (savedOrder) => {
    // Record coupon usage atomically
    if (appliedCoupon) {
      await recordCouponUsage({
        couponId: appliedCoupon._id,
        userId: req.user._id,
      }).catch((err) => {
        console.warn('[Order] Failed to record coupon usage:', err.message);
      });
    }

    // Trigger non-blocking notifications
    sendOrderConfirmationEmail({ order: savedOrder, user: req.user }).catch(() => {});
    sendOrderConfirmationSMS({ order: savedOrder, user: req.user }).catch(() => {});
  };

  // Safe Alternative with Conditional Stock Updates and Compensating Rollback
  const executeSafeOrder = async () => {
    const deductedItems = [];

    try {
      // Step 1: Conditionally deduct stock for each product
      for (const item of itemSnapshots) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );

        if (!updated) {
          throw new Error(`Insufficient stock for "${item.name}" during checkout.`);
        }

        deductedItems.push({
          productId: item.product,
          quantity: item.quantity,
        });
      }

      // Step 2: Create and save order
      const order = new Order({
        user: req.user._id,
        orderNumber,
        items: itemSnapshots,
        shippingDetails: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          pinCode: pinCode.trim(),
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'placed',
        totals,
        coupon: appliedCoupon ? appliedCoupon._id : null,
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        invoiceNumber,
        invoiceDate,
      });

      await order.save();

      // Step 3: Clear cart only after successful order creation
      cart.items = [];
      await cart.save();

      await postOrderSuccess(order);

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully with Cash on Delivery.',
        order,
      });
    } catch (orderError) {
      // Compensating Rollback: Restore all previously deducted inventory
      if (deductedItems.length > 0) {
        await Promise.all(
          deductedItems.map((d) =>
            Product.findByIdAndUpdate(d.productId, {
              $inc: { stock: d.quantity },
            })
          )
        );
      }

      return res.status(400).json({
        success: false,
        message: orderError.message || 'Failed to place order.',
      });
    }
  };

  if (useTransactions && session) {
    try {
      // 5a. Deduct stock inside transaction
      for (const item of itemSnapshots) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session }
        );

        if (!updated) {
          throw new Error(`Insufficient stock for "${item.name}" during checkout.`);
        }
      }

      // Create Order document
      const order = new Order({
        user: req.user._id,
        orderNumber,
        items: itemSnapshots,
        shippingDetails: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          pinCode: pinCode.trim(),
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'placed',
        totals,
        coupon: appliedCoupon ? appliedCoupon._id : null,
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        invoiceNumber,
        invoiceDate,
      });

      await order.save({ session });

      // Clear user's cart
      cart.items = [];
      await cart.save({ session });

      await session.commitTransaction();
      session.endSession();

      await postOrderSuccess(order);

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully with Cash on Delivery.',
        order,
      });
    } catch (txError) {
      await session.abortTransaction().catch(() => {});
      session.endSession();

      const isTxUnsupported =
        txError.message &&
        (txError.message.includes('replica set') ||
          txError.message.includes('Transactions are not supported') ||
          txError.message.includes('standalone'));

      if (isTxUnsupported) {
        return await executeSafeOrder();
      }

      return res.status(400).json({
        success: false,
        message: txError.message || 'Failed to place order. Transaction was aborted.',
      });
    }
  } else {
    return await executeSafeOrder();
  }
};

/**
 * GET /api/orders
 * Retrieves all orders belonging to the authenticated customer.
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const filter =
      req.user.role === 'admin' && req.query.all === 'true'
        ? {}
        : { user: req.user._id };

    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/orders/:id
 * Retrieves a single order by ID or orderNumber.
 * Ensures the order belongs to the authenticated user (or user is admin).
 */
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { orderNumber: id.toUpperCase() };

    const order = await Order.findOne(query).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Authorization: User can only access their own order unless they are an admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this order.',
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/orders/:id/cancel
 * Safely cancels an order if its status is 'placed' (or 'pending').
 * Restores product stock exactly once, releases coupon usage,
 * and sends cancellation notifications.
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { orderNumber: id.toUpperCase() };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // 1. Authorization: Only the owner of the order or an admin can cancel
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to cancel this order.',
      });
    }

    // 2. State verification: Reject already cancelled, shipped, or delivered orders
    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This order has already been cancelled.',
      });
    }

    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order that has already been ${order.orderStatus}.`,
      });
    }

    if (order.orderStatus !== 'placed' && order.orderStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only orders in 'placed' status can be cancelled. Current status is '${order.orderStatus}'.`,
      });
    }

    // 3. Atomic state transition: Ensure safe concurrent handling and prevent double cancellation
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: { $in: ['placed', 'pending'] } },
      { $set: { orderStatus: 'cancelled' } },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(400).json({
        success: false,
        message:
          'Order could not be cancelled. It may have already been cancelled or processed concurrently.',
      });
    }

    // 4. Restore product stock exactly once
    if (Array.isArray(updatedOrder.items) && updatedOrder.items.length > 0) {
      await Promise.all(
        updatedOrder.items.map(async (item) => {
          if (item.product && item.quantity > 0) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stock: item.quantity },
            });
          }
        })
      );
    }

    // 5. Release coupon usage if order had a coupon
    if (updatedOrder.coupon) {
      await releaseCouponUsage({
        couponId: updatedOrder.coupon,
        userId: updatedOrder.user,
      }).catch((err) => {
        console.warn('[Order] Failed to release coupon usage:', err.message);
      });
    }

    // 6. Trigger non-blocking cancellation notifications
    sendOrderCancellationEmail({ order: updatedOrder, user: req.user }).catch(() => {});
    sendOrderStatusSMS({ order: updatedOrder, user: req.user, newStatus: 'cancelled' }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Order has been successfully cancelled and stock has been restored.',
      order: updatedOrder,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/orders/:id/invoice
 * Generates and downloads a professional PDF invoice for the specified order.
 * Strictly verifies ownership (customer must own the order or be an admin).
 */
export const downloadInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { orderNumber: id.toUpperCase() };

    const order = await Order.findOne(query).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Authorization: User can only access their own invoice unless they are an admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to download this invoice.',
      });
    }

    // Ensure invoice number and date exist without altering order
    if (!order.invoiceNumber) {
      order.invoiceNumber = generateInvoiceNumber();
      order.invoiceDate = new Date();
      await order.save();
    }

    const pdfBuffer = await generateInvoicePDF(order, order.user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${order.invoiceNumber}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/orders/:id/verify-payment
 * Verifies online payment success (e.g. from Paytm or gateway callback).
 * Updates paymentStatus = 'paid', sends payment verification email & SMS,
 * and handles repeated/duplicate callbacks safely via idempotency.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transactionId = '', paymentMethod = 'card' } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { orderNumber: id.toUpperCase() };

    const order = await Order.findOne(query).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Authorization
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to verify payment for this order.',
      });
    }

    // Idempotency: If already verified, return existing success without re-sending notifications
    if (order.paymentStatus === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment has already been verified for this order.',
        order,
      });
    }

    order.paymentStatus = 'paid';
    if (paymentMethod) {
      order.paymentMethod = paymentMethod;
    }
    if (order.orderStatus === 'placed' || order.orderStatus === 'pending') {
      order.orderStatus = 'confirmed';
    }

    await order.save();

    // Send notifications safely
    sendPaymentVerificationEmail({ order, user: order.user, transactionId }).catch(() => {});
    sendPaymentVerifiedSMS({ order, user: order.user, transactionId }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      order,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
  verifyPayment,
};
