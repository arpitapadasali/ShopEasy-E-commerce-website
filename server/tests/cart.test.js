import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Cart from '../src/models/Cart.js';
import { generateToken } from '../src/utils/token.js';

test('Persistent Shopping Cart API Test Suite (Stage 5)', async (t) => {
  await setupTestDb();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let testUser = null;
  let testToken = '';
  let testCategory = null;
  let inStockProduct = null;
  let limitedStockProduct = null;
  let inactiveProduct = null;
  let addedCartItemId = null;

  t.after(async () => {
    // Clean up created entities
    if (testUser) {
      await Cart.deleteOne({ user: testUser._id });
      await User.findByIdAndDelete(testUser._id);
    }
    if (inStockProduct) {
      await Product.findByIdAndDelete(inStockProduct._id);
    }
    if (limitedStockProduct) {
      await Product.findByIdAndDelete(limitedStockProduct._id);
    }
    if (inactiveProduct) {
      await Product.findByIdAndDelete(inactiveProduct._id);
    }
    if (testCategory) {
      await Category.findByIdAndDelete(testCategory._id);
    }
    server.close();
    await teardownTestDb();
  });

  // Setup: Create test user and test products
  await t.test('Setup: Create test customer and products', async () => {
    testUser = await User.create({
      name: 'Cart Customer',
      email: `cart_user_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    testToken = generateToken(testUser);

    testCategory = await Category.create({
      name: `Cart Category ${timestamp}`,
      slug: `cart-category-${timestamp}`,
      description: 'Category for cart testing',
      isActive: true,
    });

    inStockProduct = await Product.create({
      name: `In-Stock Gadget ${timestamp}`,
      slug: `in-stock-gadget-${timestamp}`,
      description: 'Generous stock item',
      price: 150000, // ₹1,500.00
      stock: 50,
      category: testCategory._id,
      isActive: true,
    });

    limitedStockProduct = await Product.create({
      name: `Limited Gadget ${timestamp}`,
      slug: `limited-gadget-${timestamp}`,
      description: 'Scarce stock item',
      price: 250000, // ₹2,500.00
      stock: 3,
      category: testCategory._id,
      isActive: true,
    });

    inactiveProduct = await Product.create({
      name: `Deactivated Gadget ${timestamp}`,
      slug: `deactivated-gadget-${timestamp}`,
      description: 'Inactive item',
      price: 100000,
      stock: 10,
      category: testCategory._id,
      isActive: false,
    });
  });

  // Test 1: 401 Unauthorized when no token provided
  await t.test('GET /api/cart rejects unauthenticated request with 401', async () => {
    const res = await fetch(`${baseUrl}/cart`);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  // Test 2: GET /api/cart returns empty cart initially
  await t.test('GET /api/cart returns empty cart with 0 items and 0 subtotal', async () => {
    const res = await fetch(`${baseUrl}/cart`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.cart.totalItems, 0);
    assert.equal(data.cart.subtotal, 0);
    assert.equal(data.cart.items.length, 0);
  });

  // Test 3: POST /api/cart rejects negative or zero or non-integer quantity
  await t.test('POST /api/cart rejects invalid quantities with 400', async () => {
    // 0 quantity
    const resZero = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ productId: inStockProduct._id.toString(), quantity: 0 }),
    });
    assert.equal(resZero.status, 400);

    // Negative quantity
    const resNeg = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ productId: inStockProduct._id.toString(), quantity: -2 }),
    });
    assert.equal(resNeg.status, 400);

    // Non-integer float
    const resFloat = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ productId: inStockProduct._id.toString(), quantity: 1.5 }),
    });
    assert.equal(resFloat.status, 400);
  });

  // Test 4: POST /api/cart rejects inactive product
  await t.test('POST /api/cart rejects inactive product with 404', async () => {
    const res = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ productId: inactiveProduct._id.toString(), quantity: 1 }),
    });
    assert.equal(res.status, 404);
  });

  // Test 5: POST /api/cart successfully adds product and calculates server totals
  await t.test('POST /api/cart adds product with server-calculated price & subtotal', async () => {
    const res = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        productId: inStockProduct._id.toString(),
        quantity: 2,
        // Any client-sent price will be ignored completely by backend
        price: 1,
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.cart.totalItems, 2);
    assert.equal(data.cart.items.length, 1);
    assert.equal(data.cart.items[0].quantity, 2);
    assert.equal(data.cart.items[0].product._id, inStockProduct._id.toString());
    assert.equal(data.cart.items[0].product.price, inStockProduct.price);
    // Line total: 150000 * 2 = 300000
    assert.equal(data.cart.items[0].itemTotal, 300000);
    assert.equal(data.cart.subtotal, 300000);

    addedCartItemId = data.cart.items[0]._id;
  });

  // Test 6: POST /api/cart adding the same product increments quantity
  await t.test('POST /api/cart adding existing item increments quantity properly', async () => {
    const res = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        productId: inStockProduct._id.toString(),
        quantity: 1,
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.cart.totalItems, 3);
    assert.equal(data.cart.items.length, 1);
    assert.equal(data.cart.items[0].quantity, 3);
    assert.equal(data.cart.subtotal, 450000); // 150000 * 3
  });

  // Test 7: POST /api/cart enforces stock limits
  await t.test('POST /api/cart rejects request exceeding stock availability', async () => {
    // limitedStockProduct has stock: 3
    const res = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        productId: limitedStockProduct._id.toString(),
        quantity: 5, // Exceeds 3
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /stock/i);
  });

  // Test 8: PUT /api/cart/:itemId updates quantity
  await t.test('PUT /api/cart/:itemId updates quantity and recalculates totals', async () => {
    const res = await fetch(`${baseUrl}/cart/${addedCartItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ quantity: 4 }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.cart.totalItems, 4);
    assert.equal(data.cart.items[0].quantity, 4);
    assert.equal(data.cart.subtotal, 600000); // 150000 * 4
  });

  // Test 9: PUT /api/cart/:itemId rejects invalid quantities
  await t.test('PUT /api/cart/:itemId rejects non-positive or exceeding stock quantities', async () => {
    // Zero quantity
    const resZero = await fetch(`${baseUrl}/cart/${addedCartItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ quantity: 0 }),
    });
    assert.equal(resZero.status, 400);

    // Exceeding stock (inStockProduct has stock 50)
    const resExceed = await fetch(`${baseUrl}/cart/${addedCartItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ quantity: 999 }),
    });
    assert.equal(resExceed.status, 400);
    assert.match((await resExceed.json()).message, /stock/i);
  });

  // Test 10: Persistence across requests - GET /api/cart returns the persisted database state
  await t.test('GET /api/cart retrieves persisted state from MongoDB', async () => {
    const res = await fetch(`${baseUrl}/cart`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.cart.totalItems, 4);
    assert.equal(data.cart.subtotal, 600000);
  });

  // Test 11: DELETE /api/cart/:itemId removes item
  await t.test('DELETE /api/cart/:itemId removes item from cart', async () => {
    const res = await fetch(`${baseUrl}/cart/${addedCartItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${testToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.cart.items.length, 0);
    assert.equal(data.cart.totalItems, 0);
    assert.equal(data.cart.subtotal, 0);
  });

  // Test 12: Deleted or deactivated product handled gracefully
  await t.test('Gracefully handles deactivated or deleted products in cart', async () => {
    // Add product then deactivate it in MongoDB
    const tempProduct = await Product.create({
      name: `Temporary Item ${timestamp}`,
      slug: `temp-item-${timestamp}`,
      description: 'Soon to be deactivated',
      price: 80000,
      stock: 10,
      category: testCategory._id,
      isActive: true,
    });

    // Add to cart
    await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ productId: tempProduct._id.toString(), quantity: 1 }),
    });

    // Now deactivate it
    tempProduct.isActive = false;
    await tempProduct.save();

    // Fetching cart should automatically filter it out and keep total at 0
    const res = await fetch(`${baseUrl}/cart`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.cart.items.length, 0);
    assert.equal(data.cart.totalItems, 0);
    assert.equal(data.cart.subtotal, 0);

    // Clean up
    await Product.findByIdAndDelete(tempProduct._id);
  });
});
