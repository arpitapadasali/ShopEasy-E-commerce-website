import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { escapeRegex, buildProductSearchFilter } from '../utils/helpers.js';
import { sendOrderStatusEmail, sendOrderCancellationEmail } from '../services/email.service.js';
import { sendOrderStatusSMS } from '../services/sms.service.js';
import { releaseCouponUsage } from '../services/coupon.service.js';

/**
 * GET /api/admin/stats
 * Aggregates live system statistics from MongoDB Atlas:
 * - Total products and active products
 * - Total orders and status breakdown
 * - Total registered customers
 * - Total sales (excluding cancelled orders)
 * - Low-stock alerts (products with stock <= 5)
 * - Recent orders (latest 5)
 * - Daily sales timeline (last 7 days)
 */
export const getAdminStats = async (req, res, next) => {
  try {
    // 1. Total products count and low stock items (stock <= 5)
    const [totalProducts, activeProducts, lowStockProducts] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.find({ stock: { $lte: 5 } })
        .populate('category', 'name slug')
        .select('name slug price stock imageUrl category isActive')
        .sort({ stock: 1 })
        .limit(10),
    ]);

    // 2. Total customers count (excluding admin users)
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // 3. Orders aggregation: total count, status breakdown, and total sales
    // Rule: Cancelled orders are strictly excluded from sales revenue calculations.
    const orderStats = await Order.aggregate([
      {
        $facet: {
          totalOrdersCount: [{ $count: 'count' }],
          statusCounts: [
            {
              $group: {
                _id: '$orderStatus',
                count: { $sum: 1 },
              },
            },
          ],
          salesStats: [
            {
              $match: {
                orderStatus: { $ne: 'cancelled' },
              },
            },
            {
              $group: {
                _id: null,
                totalSalesPaise: { $sum: '$totals.grandTotal' },
                completedOrders: { $sum: 1 },
              },
            },
          ],
          cancelledSalesStats: [
            {
              $match: {
                orderStatus: 'cancelled',
              },
            },
            {
              $group: {
                _id: null,
                cancelledSalesPaise: { $sum: '$totals.grandTotal' },
                cancelledCount: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const facet = orderStats[0] || {};
    const totalOrders = facet.totalOrdersCount?.[0]?.count || 0;
    const totalSales = facet.salesStats?.[0]?.totalSalesPaise || 0;
    const cancelledSales = facet.cancelledSalesStats?.[0]?.cancelledSalesPaise || 0;

    // Build status breakdown map
    const ordersByStatus = {
      placed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    (facet.statusCounts || []).forEach((item) => {
      if (item._id) {
        ordersByStatus[item._id] = item.count;
      }
    });

    // 4. Recent orders (latest 5)
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // 5. Daily Sales Aggregation for the past 7 days (for chart)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          orderStatus: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totals.grandTotal' },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        totalCustomers,
        totalOrders,
        totalSales, // in integer paise (cancelled excluded)
        cancelledSales, // in integer paise
        ordersByStatus,
        lowStockProducts,
        recentOrders,
        dailySales,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/products
 * Returns paginated product list for admin with search, category, stock, and active status filters.
 */
export const getAdminProducts = async (req, res, next) => {
  try {
    const { search, category, status, stockLt, page = 1, limit = 15 } = req.query;

    const query = {};

    if (search && search.trim()) {
      const searchFilter = await buildProductSearchFilter(search.trim(), Category);
      if (searchFilter) {
        if (!query.$and) {
          query.$and = [];
        }
        query.$and.push(searchFilter);
      }
    }

    if (category && typeof category === 'string' && category.trim() !== '') {
      const trimmedCat = category.trim();
      if (mongoose.Types.ObjectId.isValid(trimmedCat)) {
        query.category = trimmedCat;
      } else {
        const catDoc = await Category.findOne({ slug: trimmedCat.toLowerCase() });
        if (catDoc) query.category = catDoc._id;
      }
    }

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    if (stockLt !== undefined) {
      query.stock = { $lte: parseInt(stockLt, 10) };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      products,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/categories
 * Returns all categories (active and inactive) along with the count of products assigned to each.
 */
export const getAdminCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    // Attach product count to each category for safe deletion and reassignment checks
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({ category: cat._id });
        return {
          ...cat.toObject(),
          productCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      categories: categoriesWithCount,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/orders
 * Returns all customer orders with pagination, status filtering, and order number search.
 */
export const getAdminOrders = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.orderStatus = status;
    }

    if (search && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      filter.orderNumber = { $regex: sanitized, $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      orders,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/orders/:id
 * Retrieves full details for any order by ID or orderNumber.
 */
export const getAdminOrderById = async (req, res, next) => {
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

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/admin/orders/:id/status
 * Updates the order status with strict transition validation.
 * Rejects invalid status transitions, handles stock restoration on cancellation,
 * and updates paymentStatus on delivery for COD.
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status: "${status}". Valid statuses are: ${validStatuses.join(', ')}.`,
      });
    }

    const newStatus = status.toLowerCase();

    const order = await Order.findById(id).populate('user', 'name email phone');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const currentStatus = order.orderStatus;

    // No-op if status is unchanged
    if (currentStatus === newStatus) {
      return res.status(200).json({
        success: true,
        message: `Order status is already "${newStatus}".`,
        order,
      });
    }

    // Rule 1: Delivered orders cannot be changed
    if (currentStatus === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been delivered and its status cannot be modified.',
      });
    }

    // Rule 2: Cancelled orders cannot be modified
    if (currentStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cancelled orders cannot be reopened or transitioned to another status.',
      });
    }

    // Rule 3: Shipped orders cannot be cancelled
    if (currentStatus === 'shipped' && newStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an order that has already shipped.',
      });
    }

    // Rule 4: If transitioning to cancelled, restore stock exactly once and release coupon
    if (newStatus === 'cancelled' && currentStatus !== 'cancelled') {
      if (Array.isArray(order.items) && order.items.length > 0) {
        await Promise.all(
          order.items.map(async (item) => {
            if (item.product && item.quantity > 0) {
              await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity },
              });
            }
          })
        );
      }

      if (order.coupon) {
        await releaseCouponUsage({
          couponId: order.coupon,
          userId: order.user?._id || order.user,
        }).catch(() => {});
      }
    }

    // Rule 5: If transitioning to delivered and payment was COD, set paymentStatus to paid
    if (newStatus === 'delivered' && order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }

    order.orderStatus = newStatus;
    await order.save();

    // Trigger non-blocking notifications
    if (newStatus === 'cancelled') {
      sendOrderCancellationEmail({ order, user: order.user }).catch(() => {});
    } else {
      sendOrderStatusEmail({ order, user: order.user, newStatus }).catch(() => {});
    }
    sendOrderStatusSMS({ order, user: order.user, newStatus }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Order status updated from "${currentStatus}" to "${newStatus}".`,
      order,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/customers
 * Returns list of registered customers without sensitive fields (e.g. passwordHash).
 */
export const getAdminCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('name email phone address city pinCode createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    return next(error);
  }
};
