import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { wishlistService } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch wishlist from server whenever user is authenticated
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await wishlistService.getWishlist();
      if (data.success && Array.isArray(data.products)) {
        setWishlist(data.products);
      }
    } catch (err) {
      console.error('[WishlistContext] Failed to fetch wishlist:', err.message);
      setError(err.message || 'Could not load your wishlist.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Set of product IDs in wishlist for O(1) lookup
  const wishlistProductIds = useMemo(() => {
    const ids = new Set();
    wishlist.forEach((item) => {
      const id = typeof item === 'object' ? item?._id : item;
      if (id) ids.add(id.toString());
    });
    return ids;
  }, [wishlist]);

  const isInWishlist = useCallback(
    (productId) => {
      if (!productId) return false;
      const id = typeof productId === 'object' ? productId?._id : productId;
      return wishlistProductIds.has(id.toString());
    },
    [wishlistProductIds]
  );

  // Add item to wishlist
  const addToWishlist = async (product) => {
    if (!isAuthenticated) {
      return {
        success: false,
        requiresAuth: true,
        message: 'Please sign in to add products to your wishlist.',
      };
    }

    const productId = typeof product === 'object' ? product._id : product;
    setActionLoading(true);
    setError(null);
    try {
      const data = await wishlistService.addToWishlist(productId);
      if (data.success) {
        // Optimistically update or refetch
        if (typeof product === 'object') {
          setWishlist((prev) => {
            const exists = prev.some((p) => p._id.toString() === productId.toString());
            return exists ? prev : [product, ...prev];
          });
        } else {
          fetchWishlist();
        }
        return { success: true, message: data.message };
      }
      throw new Error(data.message || 'Failed to add product to wishlist.');
    } catch (err) {
      console.error('[WishlistContext] Add to wishlist error:', err);
      const msg = err.message || 'Failed to add product to wishlist.';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setActionLoading(false);
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = async (productId) => {
    if (!isAuthenticated) return { success: false };

    const targetId = typeof productId === 'object' ? productId._id : productId;
    setActionLoading(true);
    setError(null);
    try {
      const data = await wishlistService.removeFromWishlist(targetId);
      if (data.success) {
        setWishlist((prev) => prev.filter((p) => (p._id || p).toString() !== targetId.toString()));
        return { success: true, message: data.message };
      }
      throw new Error(data.message || 'Failed to remove product from wishlist.');
    } catch (err) {
      console.error('[WishlistContext] Remove from wishlist error:', err);
      const msg = err.message || 'Failed to remove product from wishlist.';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle item in/out of wishlist
  const toggleWishlist = async (product) => {
    const productId = typeof product === 'object' ? product._id : product;
    if (isInWishlist(productId)) {
      return await removeFromWishlist(productId);
    } else {
      return await addToWishlist(product);
    }
  };

  const value = {
    wishlist,
    wishlistCount: wishlist.length,
    loading,
    actionLoading,
    error,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    fetchWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default WishlistContext;
