import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Wishlist from '../src/models/Wishlist.js';
import Cart from '../src/models/Cart.js';
import { generateToken } from '../src/utils/token.js';

test('Customer Wishlist Test Suite (Feature 2)', async (t) => {
  await setupTestDb();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let user1 = null;
  let token1 = '';
  let user2 = null;
  let token2 = '';
  let testCategory = null;
  let activeProduct1 = null;
  let activeProduct2 = null;
  let outOfStockProduct = null;

  t.after(async () => {
    if (user1) {
      await Wishlist.deleteOne({ user: user1._id });
      await Cart.deleteOne({ user: user1._id });
      await User.findByIdAndDelete(user1._id);
    }
    if (user2) {
      await Wishlist.deleteOne({ user: user2._id });
      await Cart.deleteOne({ user: user2._id });
      await User.findByIdAndDelete(user2._id);
    }
    if (activeProduct1) await Product.findByIdAndDelete(activeProduct1._id);
    if (activeProduct2) await Product.findByIdAndDelete(activeProduct2._id);
    if (outOfStockProduct) await Product.findByIdAndDelete(outOfStockProduct._id);
    if (testCategory) await Category.findByIdAndDelete(testCategory._id);

    server.close();
    await teardownTestDb();
  });

  await t.test('Setup: Create test users, category, and products', async () => {
    user1 = await User.create({
      name: 'Wishlist User 1',
      email: `wishlist_u1_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    token1 = generateToken(user1);

    user2 = await User.create({
      name: 'Wishlist User 2',
      email: `wishlist_u2_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    token2 = generateToken(user2);

    testCategory = await Category.create({
      name: `Wishlist Cat ${timestamp}`,
      slug: `wishlist-cat-${timestamp}`,
      description: 'Category for wishlist testing',
    });

    activeProduct1 = await Product.create({
      name: `Wishlist Item Alpha ${timestamp}`,
      slug: `wishlist-alpha-${timestamp}`,
      description: 'Product Alpha description',
      price: 199900,
      stock: 15,
      category: testCategory._id,
      isActive: true,
    });

    activeProduct2 = await Product.create({
      name: `Wishlist Item Beta ${timestamp}`,
      slug: `wishlist-beta-${timestamp}`,
      description: 'Product Beta description',
      price: 299900,
      stock: 5,
      category: testCategory._id,
      isActive: true,
    });

    outOfStockProduct = await Product.create({
      name: `Wishlist Out Of Stock ${timestamp}`,
      slug: `wishlist-oos-${timestamp}`,
      description: 'Out of stock product description',
      price: 99900,
      stock: 0,
      category: testCategory._id,
      isActive: true,
    });

    assert.ok(user1._id);
    assert.ok(user2._id);
    assert.ok(activeProduct1._id);
    assert.ok(outOfStockProduct._id);
  });

  await t.test('GET /api/wishlist - Unauthenticated request rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/wishlist`);
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/wishlist - Authenticated customer receives empty wishlist initially', async () => {
    const res = await fetch(`${baseUrl}/wishlist`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.deepStrictEqual(data.products, []);
    assert.strictEqual(data.totalItems, 0);
  });

  await t.test('POST /api/wishlist/:productId - Add products to wishlist', async () => {
    const res = await fetch(`${baseUrl}/wishlist/${activeProduct1._id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.products.length, 1);
    assert.strictEqual(data.products[0]._id.toString(), activeProduct1._id.toString());
  });

  await t.test('POST /api/wishlist/:productId - Duplicate addition is idempotent and safe', async () => {
    // Attempt adding activeProduct1 a second time
    const res = await fetch(`${baseUrl}/wishlist/${activeProduct1._id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    // Count remains exactly 1
    assert.strictEqual(data.products.length, 1);

    // Add a second distinct product
    const res2 = await fetch(`${baseUrl}/wishlist/${activeProduct2._id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
    });
    const data2 = await res2.json();
    assert.strictEqual(data2.products.length, 2);
  });

  await t.test('POST /api/wishlist/:productId - Non-existent or inactive product returns 404', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await fetch(`${baseUrl}/wishlist/${fakeId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert.strictEqual(res.status, 404);
  });

  await t.test('Customer Isolation: User 2 cannot see User 1’s wishlist items', async () => {
    const resUser2 = await fetch(`${baseUrl}/wishlist`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const dataUser2 = await resUser2.json();

    assert.strictEqual(resUser2.status, 200);
    assert.strictEqual(dataUser2.products.length, 0);
  });

  await t.test('DELETE /api/wishlist/:productId - Remove product from wishlist', async () => {
    const res = await fetch(`${baseUrl}/wishlist/${activeProduct1._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` },
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.products.length, 1);
    assert.strictEqual(data.products[0]._id.toString(), activeProduct2._id.toString());
  });

  await t.test('Cart Integration: Adding wishlist product to cart validates inventory', async () => {
    // Add out-of-stock product to wishlist
    await fetch(`${baseUrl}/wishlist/${outOfStockProduct._id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
    });

    // Attempting to add outOfStockProduct to Cart is rejected by Cart logic
    const cartResOOS = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        productId: outOfStockProduct._id,
        quantity: 1,
      }),
    });
    assert.strictEqual(cartResOOS.status, 400);

    // Adding in-stock activeProduct2 from wishlist to Cart succeeds
    const cartResValid = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        productId: activeProduct2._id,
        quantity: 1,
      }),
    });
    const cartDataValid = await cartResValid.json();
    assert.strictEqual(cartResValid.status, 200);
    assert.strictEqual(cartDataValid.success, true);
    assert.strictEqual(cartDataValid.cart.items.length, 1);
  });
});
