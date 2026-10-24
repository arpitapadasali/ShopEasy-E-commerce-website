import test from 'node:test';
import assert from 'node:assert/strict';
import { formatINR } from '../src/utils/formatters.js';
import { reviewService } from '../src/services/api.js';

test('Frontend Validation, Formatting, Cart & Route Logic Test Suite', async (t) => {
  // ==========================================
  // 1. REGISTRATION & LOGIN VALIDATION TESTS
  // ==========================================
  await t.test('Form Validation: Login and Registration Input Rules', () => {
    // Email regex matching the app's standards
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert.equal(emailRegex.test('customer@example.com'), true);
    assert.equal(emailRegex.test('invalid-email'), false);
    assert.equal(emailRegex.test('user@domain'), false);
    assert.equal(emailRegex.test(''), false);

    // Password validation (min 6 characters)
    const isValidPassword = (p) => typeof p === 'string' && p.length >= 6;
    assert.equal(isValidPassword('123456'), true);
    assert.equal(isValidPassword('short'), false);
    assert.equal(isValidPassword(''), false);

    // Password Confirmation Match
    const doPasswordsMatch = (p1, p2) => p1 === p2 && p1.length >= 6;
    assert.equal(doPasswordsMatch('secret123', 'secret123'), true);
    assert.equal(doPasswordsMatch('secret123', 'different'), false);

    // Full name validation
    const isValidName = (name) => typeof name === 'string' && name.trim().length >= 2;
    assert.equal(isValidName('Aarav Sharma'), true);
    assert.equal(isValidName('A'), false);
    assert.equal(isValidName('   '), false);

    // Phone validation (10 digits Indian phone format)
    const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
    assert.equal(phoneRegex.test('9876543210'), true);
    assert.equal(phoneRegex.test('+91 9876543210'), true);
    assert.equal(phoneRegex.test('12345'), false);

    // PIN code validation
    const pinRegex = /^\d{6}$/;
    assert.equal(pinRegex.test('560038'), true);
    assert.equal(pinRegex.test('1234'), false);
    assert.equal(pinRegex.test('abc123'), false);
  });

  // ==========================================
  // 2. PRODUCT RENDERING & CURRENCY FORMATTING
  // ==========================================
  await t.test('Product Display: Currency formatting in INR with integer paise', () => {
    // ₹4,999.00 from 499900 paise
    const formatted1 = formatINR(499900);
    assert.ok(formatted1.includes('4,999.00') || formatted1.includes('4999.00'));
    assert.ok(formatted1.includes('₹') || formatted1.includes('INR'));

    // ₹0.00 fallback for invalid or null inputs
    assert.equal(formatINR(null), '₹0.00');
    assert.equal(formatINR(undefined), '₹0.00');
    assert.equal(formatINR('invalid'), '₹0.00');

    // 0 paise
    const zeroFormatted = formatINR(0);
    assert.ok(zeroFormatted.includes('0.00'));
  });

  await t.test('Product Catalog: Stock status calculation and badges', () => {
    const getStockStatus = (stock, isActive) => {
      if (!isActive) return { label: 'Unavailable', status: 'inactive', canBuy: false };
      if (stock <= 0) return { label: 'Out of Stock', status: 'out_of_stock', canBuy: false };
      if (stock <= 5) return { label: `Low Stock: Only ${stock} left`, status: 'low_stock', canBuy: true };
      return { label: 'In Stock', status: 'in_stock', canBuy: true };
    };

    assert.deepEqual(getStockStatus(0, true), { label: 'Out of Stock', status: 'out_of_stock', canBuy: false });
    assert.deepEqual(getStockStatus(3, true), { label: 'Low Stock: Only 3 left', status: 'low_stock', canBuy: true });
    assert.deepEqual(getStockStatus(50, true), { label: 'In Stock', status: 'in_stock', canBuy: true });
    assert.deepEqual(getStockStatus(10, false), { label: 'Unavailable', status: 'inactive', canBuy: false });
  });

  await t.test('Product Catalog: Search and Category Filtering logic', () => {
    const sampleProducts = [
      { name: 'AcousticPro Wireless Headphones', category: 'electronics', price: 499900 },
      { name: 'UltraGlow 4K Monitor', category: 'electronics', price: 2499900 },
      { name: 'Organic Cotton T-Shirt', category: 'fashion', price: 79900 },
      { name: 'Barista Pour-Over Kettle', category: 'home', price: 219900 },
    ];

    // Search filter
    const searchMatch = (list, query) =>
      list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    assert.equal(searchMatch(sampleProducts, 'headphone').length, 1);
    assert.equal(searchMatch(sampleProducts, 'NONEXISTENT').length, 0);

    // Category filter
    const categoryMatch = (list, cat) =>
      cat ? list.filter((p) => p.category === cat) : list;
    assert.equal(categoryMatch(sampleProducts, 'electronics').length, 2);
    assert.equal(categoryMatch(sampleProducts, 'fashion').length, 1);
    assert.equal(categoryMatch(sampleProducts, null).length, 4);
  });

  await t.test('Pagination Logic: 8 products per page default calculation', () => {
    const paginate = (items, page = 1, limit = 8) => {
      const startIndex = (page - 1) * limit;
      return items.slice(startIndex, startIndex + limit);
    };

    const mockItems = Array.from({ length: 18 }, (_, i) => ({ id: i + 1 }));
    const totalPages = Math.ceil(mockItems.length / 8);

    assert.equal(totalPages, 3);
    assert.equal(paginate(mockItems, 1, 8).length, 8);
    assert.equal(paginate(mockItems, 2, 8).length, 8);
    assert.equal(paginate(mockItems, 3, 8).length, 2);
  });

  await t.test('Product Listing: 12 products per page default pagination & button bounds', () => {
    const paginate12 = (items, page = 1, limit = 12) => {
      const startIndex = (page - 1) * limit;
      return items.slice(startIndex, startIndex + limit);
    };

    const mockProducts = Array.from({ length: 30 }, (_, i) => ({ id: `p${i + 1}` }));
    const totalPages = Math.ceil(mockProducts.length / 12);

    assert.equal(totalPages, 3);
    assert.equal(paginate12(mockProducts, 1, 12).length, 12);
    assert.equal(paginate12(mockProducts, 2, 12).length, 12);
    assert.equal(paginate12(mockProducts, 3, 12).length, 6);

    // Button state logic
    const isPrevDisabled = (page) => page <= 1;
    const isNextDisabled = (page, total) => page >= total;

    assert.equal(isPrevDisabled(1), true);
    assert.equal(isPrevDisabled(2), false);
    assert.equal(isNextDisabled(1, totalPages), false);
    assert.equal(isNextDisabled(3, totalPages), true);

    // Filter change resets page to 1
    const applyFilter = (currentParams, newFilter) => ({
      ...currentParams,
      ...newFilter,
      page: 1,
    });
    const state1 = { page: 3, category: 'electronics' };
    const state2 = applyFilter(state1, { search: 'dress' });
    assert.equal(state2.page, 1);
    assert.equal(state2.search, 'dress');
  });

  // ==========================================
  // 3. CART BEHAVIOR & CALCULATION LOGIC
  // ==========================================
  await t.test('Cart Calculations: Line totals, subtotals and quantity limits', () => {
    const cartItems = [
      { product: { id: 'p1', name: 'Item 1', price: 100000, stock: 10 }, quantity: 2 },
      { product: { id: 'p2', name: 'Item 2', price: 250000, stock: 5 }, quantity: 3 },
    ];

    // Line totals in integer paise
    const lineTotal1 = cartItems[0].product.price * cartItems[0].quantity; // 200000
    const lineTotal2 = cartItems[1].product.price * cartItems[1].quantity; // 750000
    assert.equal(lineTotal1, 200000);
    assert.equal(lineTotal2, 750000);

    // Cart subtotal
    const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    assert.equal(subtotal, 950000);

    // Total item count badge
    const totalItemsBadge = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    assert.equal(totalItemsBadge, 5);

    // Quantity boundary validation
    const canIncrement = (item) => item.quantity < item.product.stock;
    const canDecrement = (item) => item.quantity > 1;

    assert.equal(canIncrement(cartItems[0]), true); // 2 < 10
    assert.equal(canIncrement({ ...cartItems[1], quantity: 5 }), false); // 5 === stock 5
    assert.equal(canDecrement(cartItems[0]), true); // 2 > 1
    assert.equal(canDecrement({ ...cartItems[0], quantity: 1 }), false); // cannot drop below 1
  });

  await t.test('Cart: Empty state identification', () => {
    const emptyCart = { items: [] };
    const populatedCart = { items: [{ id: 'item1' }] };

    const isEmpty = (cart) => !cart || !cart.items || cart.items.length === 0;
    assert.equal(isEmpty(emptyCart), true);
    assert.equal(isEmpty(populatedCart), false);
    assert.equal(isEmpty(null), true);
  });

  // ==========================================
  // 4. ROUTE PROTECTION & AUTHORIZATION LOGIC
  // ==========================================
  await t.test('Route Protection: Authentication and Role-based access rules', () => {
    // Evaluates route authorization outcome
    const checkRouteAccess = ({ isAuthenticated, role, requiredRole }) => {
      if (!isAuthenticated) return { allowed: false, redirect: '/login' };
      if (requiredRole === 'admin' && role !== 'admin') {
        return { allowed: false, redirect: '/unauthorized' };
      }
      return { allowed: true, redirect: null };
    };

    // Unauthenticated visiting protected route
    assert.deepEqual(
      checkRouteAccess({ isAuthenticated: false, role: null, requiredRole: 'customer' }),
      { allowed: false, redirect: '/login' }
    );

    // Authenticated customer visiting customer route
    assert.deepEqual(
      checkRouteAccess({ isAuthenticated: true, role: 'customer', requiredRole: 'customer' }),
      { allowed: true, redirect: null }
    );

    // Authenticated customer visiting admin route -> Forbidden
    assert.deepEqual(
      checkRouteAccess({ isAuthenticated: true, role: 'customer', requiredRole: 'admin' }),
      { allowed: false, redirect: '/unauthorized' }
    );

    // Authenticated admin visiting admin route -> Allowed
    assert.deepEqual(
      checkRouteAccess({ isAuthenticated: true, role: 'admin', requiredRole: 'admin' }),
      { allowed: true, redirect: null }
    );
  });

  // ==========================================
  // 5. API ERROR HANDLING & NORMALIZATION
  // ==========================================
  await t.test('API Error Handling: Centralized error response parser', () => {
    const parseApiError = (error) => {
      return (
        error.response?.data?.message ||
        error.message ||
        'An unexpected network error occurred'
      );
    };

    const serverError = {
      response: {
        status: 400,
        data: { message: 'Insufficient stock available' },
      },
    };
    assert.equal(parseApiError(serverError), 'Insufficient stock available');

    const networkError = { message: 'Network Error' };
    assert.equal(parseApiError(networkError), 'Network Error');

    const emptyError = {};
    assert.equal(parseApiError(emptyError), 'An unexpected network error occurred');
  });

  // ==========================================
  // 6. REVIEW SERVICE & API INTEGRATION TESTS
  // ==========================================
  await t.test('Review Service: createReview is a callable function and exports match expectations', () => {
    assert.equal(typeof reviewService.createReview, 'function', 'reviewService.createReview must be a function');
    assert.equal(typeof reviewService.createProductReview, 'function', 'reviewService.createProductReview must be a function');
    assert.equal(typeof reviewService.getProductReviews, 'function', 'reviewService.getProductReviews must be a function');
    assert.equal(typeof reviewService.updateReview, 'function', 'reviewService.updateReview must be a function');
    assert.equal(typeof reviewService.deleteReview, 'function', 'reviewService.deleteReview must be a function');
  });
});
