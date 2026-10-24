import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cart from server whenever user is authenticated
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await cartService.getCart();
      if (data.success && data.cart) {
        setCart(data.cart);
      }
    } catch (err) {
      console.error('[CartContext] Failed to fetch cart:', err.message);
      setError(err.message || 'Could not load your shopping cart.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    if (!isAuthenticated) {
      return {
        success: false,
        requiresAuth: true,
        message: 'Please sign in to add items to your cart.',
      };
    }

    setActionLoading(true);
    setError(null);
    try {
      const data = await cartService.addToCart(productId, quantity);
      if (data.success && data.cart) {
        setCart(data.cart);
        return { success: true, message: data.message, cart: data.cart };
      }
      throw new Error(data.message || 'Failed to add item to cart.');
    } catch (err) {
      const message = err.message || 'Failed to add item to cart.';
      setError(message);
      return { success: false, message };
    } finally {
      setActionLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (itemId, newQuantity) => {
    if (!isAuthenticated) return { success: false, requiresAuth: true };

    setActionLoading(true);
    setError(null);
    try {
      const data = await cartService.updateCartItem(itemId, newQuantity);
      if (data.success && data.cart) {
        setCart(data.cart);
        return { success: true, cart: data.cart };
      }
      throw new Error(data.message || 'Failed to update item quantity.');
    } catch (err) {
      const message = err.message || 'Failed to update item quantity.';
      setError(message);
      return { success: false, message };
    } finally {
      setActionLoading(false);
    }
  };

  // Remove item from cart
  const removeItem = async (itemId) => {
    if (!isAuthenticated) return { success: false, requiresAuth: true };

    setActionLoading(true);
    setError(null);
    try {
      const data = await cartService.removeFromCart(itemId);
      if (data.success && data.cart) {
        setCart(data.cart);
        return { success: true, message: data.message, cart: data.cart };
      }
      throw new Error(data.message || 'Failed to remove item.');
    } catch (err) {
      const message = err.message || 'Failed to remove item.';
      setError(message);
      return { success: false, message };
    } finally {
      setActionLoading(false);
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!isAuthenticated) return { success: false, requiresAuth: true };

    setActionLoading(true);
    setError(null);
    try {
      const data = await cartService.clearCart();
      if (data.success && data.cart) {
        setCart(data.cart);
        return { success: true, cart: data.cart };
      }
    } catch (err) {
      const message = err.message || 'Failed to clear cart.';
      setError(message);
      return { success: false, message };
    } finally {
      setActionLoading(false);
    }
  };

  const items = cart?.items || [];
  const totalItems = cart?.totalItems || 0;
  const subtotal = cart?.subtotal || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        items,
        totalItems,
        subtotal,
        loading,
        actionLoading,
        error,
        fetchCart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
