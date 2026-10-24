import axios from 'axios';
import { API_BASE_URL } from '../config/constants.js';

// Base Axios instance for API requests
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: attach JWT bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('shopeasy_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: centralize API error response handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = error.response?.data?.message;
    if (!message) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'Server request timed out. Please verify that the backend server is running and accessible.';
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        message = 'Cannot connect to backend server at http://localhost:5000. Please ensure the server is running.';
      } else {
        message = error.message || 'An unexpected network error occurred';
      }
    }
    const errorResponse = {
      message,
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(errorResponse);
  }
);

// Health check service
export const healthService = {
  checkHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

// Authentication service
export const authService = {
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  },
  checkAdminAccess: async () => {
    const response = await apiClient.get('/auth/admin-only');
    return response.data;
  },
};

// Product catalog service
export const productService = {
  getProducts: async (params = {}) => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },
  getProductById: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },
  createProduct: async (productData) => {
    const response = await apiClient.post('/products', productData);
    return response.data;
  },
  updateProduct: async (id, productData) => {
    const response = await apiClient.put(`/products/${id}`, productData);
    return response.data;
  },
  deleteProduct: async (id) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
  importCSV: async (csvData) => {
    const response = await apiClient.post('/products/import-csv', { csvData });
    return response.data;
  },
  downloadSampleCSV: async () => {
    const response = await apiClient.get('/products/sample-csv', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Category catalog service
export const categoryService = {
  getCategories: async () => {
    const response = await apiClient.get('/categories');
    return response.data;
  },
  getCategoryById: async (id) => {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },
  createCategory: async (categoryData) => {
    const response = await apiClient.post('/categories', categoryData);
    return response.data;
  },
  updateCategory: async (id, categoryData) => {
    const response = await apiClient.put(`/categories/${id}`, categoryData);
    return response.data;
  },
  deleteCategory: async (id) => {
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },
};

// Cart service for persistent shopping cart
export const cartService = {
  getCart: async () => {
    const response = await apiClient.get('/cart');
    return response.data;
  },
  addToCart: async (productId, quantity = 1) => {
    const response = await apiClient.post('/cart', { productId, quantity });
    return response.data;
  },
  updateCartItem: async (itemId, quantity) => {
    const response = await apiClient.put(`/cart/${itemId}`, { quantity });
    return response.data;
  },
  removeFromCart: async (itemId) => {
    const response = await apiClient.delete(`/cart/${itemId}`);
    return response.data;
  },
  clearCart: async () => {
    const response = await apiClient.delete('/cart');
    return response.data;
  },
};

// Order service for checkout and order history
export const orderService = {
  createOrder: async (orderData) => {
    const response = await apiClient.post('/orders', orderData);
    return response.data;
  },
  getMyOrders: async () => {
    const response = await apiClient.get('/orders');
    return response.data;
  },
  getOrderById: async (id) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },
  cancelOrder: async (id) => {
    const response = await apiClient.patch(`/orders/${id}/cancel`);
    return response.data;
  },
  downloadInvoice: async (id) => {
    const response = await apiClient.get(`/orders/${id}/invoice`, {
      responseType: 'blob',
    });
    return response.data;
  },
  verifyPayment: async (id, paymentData = {}) => {
    const response = await apiClient.post(`/orders/${id}/verify-payment`, paymentData);
    return response.data;
  },
};

// Coupon service for cart & checkout validation
export const couponService = {
  validateCoupon: async (code, subtotal) => {
    const response = await apiClient.post('/coupons/validate', { code, subtotal });
    return response.data;
  },
};

// Admin operations service
export const adminService = {
  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },
  getProducts: async (params = {}) => {
    const response = await apiClient.get('/admin/products', { params });
    return response.data;
  },
  getCategories: async () => {
    const response = await apiClient.get('/admin/categories');
    return response.data;
  },
  getOrders: async (params = {}) => {
    const response = await apiClient.get('/admin/orders', { params });
    return response.data;
  },
  getOrderById: async (id) => {
    const response = await apiClient.get(`/admin/orders/${id}`);
    return response.data;
  },
  updateOrderStatus: async (id, status) => {
    const response = await apiClient.patch(`/admin/orders/${id}/status`, { status });
    return response.data;
  },
  getCustomers: async () => {
    const response = await apiClient.get('/admin/customers');
    return response.data;
  },
  importProductsCSV: async (csvData) => {
    const response = await apiClient.post('/admin/products/import-csv', { csvData });
    return response.data;
  },
  downloadSampleCSV: async () => {
    const response = await apiClient.get('/admin/products/sample-csv', {
      responseType: 'blob',
    });
    return response.data;
  },
  // Admin Coupon Operations
  getCoupons: async (params = {}) => {
    const response = await apiClient.get('/admin/coupons', { params });
    return response.data;
  },
  getCouponById: async (id) => {
    const response = await apiClient.get(`/admin/coupons/${id}`);
    return response.data;
  },
  createCoupon: async (couponData) => {
    const response = await apiClient.post('/admin/coupons', couponData);
    return response.data;
  },
  updateCoupon: async (id, couponData) => {
    const response = await apiClient.put(`/admin/coupons/${id}`, couponData);
    return response.data;
  },
  toggleCouponStatus: async (id) => {
    const response = await apiClient.patch(`/admin/coupons/${id}/toggle`);
    return response.data;
  },
  deleteCoupon: async (id) => {
    const response = await apiClient.delete(`/admin/coupons/${id}`);
    return response.data;
  },
  // Admin Review Operations
  getReviews: async (params = {}) => {
    const response = await apiClient.get('/admin/reviews', { params });
    return response.data;
  },
  moderateReview: async (reviewId, status) => {
    const response = await apiClient.patch(`/admin/reviews/${reviewId}/moderation`, { status });
    return response.data;
  },
  deleteReview: async (reviewId) => {
    const response = await apiClient.delete(`/admin/reviews/${reviewId}`);
    return response.data;
  },
};

// Product Reviews service
export const reviewService = {
  getProductReviews: async (productId, params = {}) => {
    const response = await apiClient.get(`/products/${productId}/reviews`, { params });
    return response.data;
  },
  createReview: async (productId, reviewData) => {
    const response = await apiClient.post(`/products/${productId}/reviews`, reviewData);
    return response.data;
  },
  createProductReview: async (productId, reviewData) => {
    const response = await apiClient.post(`/products/${productId}/reviews`, reviewData);
    return response.data;
  },
  updateReview: async (reviewId, reviewData) => {
    const response = await apiClient.put(`/reviews/${reviewId}`, reviewData);
    return response.data;
  },
  deleteReview: async (reviewId) => {
    const response = await apiClient.delete(`/reviews/${reviewId}`);
    return response.data;
  },
};

// Customer Wishlist service
export const wishlistService = {
  getWishlist: async () => {
    const response = await apiClient.get('/wishlist');
    return response.data;
  },
  addToWishlist: async (productId) => {
    const response = await apiClient.post(`/wishlist/${productId}`);
    return response.data;
  },
  removeFromWishlist: async (productId) => {
    const response = await apiClient.delete(`/wishlist/${productId}`);
    return response.data;
  },
};

export default apiClient;



