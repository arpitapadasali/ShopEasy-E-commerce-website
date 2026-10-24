import mongoose from 'mongoose';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';

/**
 * GET /api/wishlist
 * Authenticated customer endpoint to retrieve their saved products.
 */
export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: 'products',
      populate: { path: 'category', select: 'name slug' },
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, products: [] });
    }

    // Filter out nulls in case any product was hard-deleted from catalog
    const validProducts = (wishlist.products || []).filter(Boolean);

    // If any orphaned null references were filtered, persist the clean array
    if (wishlist.products.length !== validProducts.length) {
      wishlist.products = validProducts.map((p) => p._id);
      await wishlist.save();
    }

    return res.status(200).json({
      success: true,
      count: validProducts.length,
      totalItems: validProducts.length,
      products: validProducts,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/wishlist/:productId
 * Authenticated customer endpoint to add a product to their wishlist.
 * Idempotent: duplicates are prevented via $addToSet.
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or currently unavailable.',
      });
    }

    await Wishlist.findOneAndUpdate(
      { user: userId },
      { $addToSet: { products: product._id } },
      { new: true, upsert: true }
    );

    const updatedWishlist = await Wishlist.findOne({ user: userId }).populate({
      path: 'products',
      populate: { path: 'category', select: 'name slug' },
    });
    const validProducts = (updatedWishlist?.products || []).filter(Boolean);

    return res.status(200).json({
      success: true,
      message: `"${product.name}" added to your wishlist.`,
      inWishlist: true,
      count: validProducts.length,
      totalItems: validProducts.length,
      products: validProducts,
      productId: product._id,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/wishlist/:productId
 * Authenticated customer endpoint to remove a product from their wishlist.
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    await Wishlist.findOneAndUpdate(
      { user: userId },
      { $pull: { products: new mongoose.Types.ObjectId(productId) } },
      { new: true }
    );

    const updatedWishlist = await Wishlist.findOne({ user: userId }).populate({
      path: 'products',
      populate: { path: 'category', select: 'name slug' },
    });
    const validProducts = (updatedWishlist?.products || []).filter(Boolean);

    return res.status(200).json({
      success: true,
      message: 'Product removed from your wishlist.',
      inWishlist: false,
      count: validProducts.length,
      totalItems: validProducts.length,
      products: validProducts,
      productId,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
