import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Cart from '../src/models/Cart.js';
import Order from '../src/models/Order.js';
import { generateToken } from '../src/utils/token.js';

test('Checkout & Order Creation API Test Suite (Stage 6)', async (t) => {
  await setupTestDb();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let customerA = null;
  let tokenA = '';
  let customerB = null;
  let tokenB = '';
  let testCategory = null;
  let product1 = null;
  let product2 = null;
  let scarceProduct = null;
  let createdOrderId = null;

  t.after(async () => {
    // Clean up created entities
    if (customerA) {
      await Cart.deleteOne({ user: customerA._id });
      await Order.deleteMany({ user: customerA._id });
      await User.findByIdAndDelete(customerA._id);
    }
    if (customerB) {
      await Cart.deleteOne({ user: customerB._id });
      await Order.deleteMany({ user: customerB._id });
      await User.findByIdAndDelete(customerB._id);
    }
    if (product1) await Product.findByIdAndDelete(product1._id);
    if (product2) await Product.findByIdAndDelete(product2._id);
    if (scarceProduct) await Product.findByIdAndDelete(scarceProduct._id);
    if (testCategory) await Category.findByIdAndDelete(testCategory._id);

    server.close();
    await teardownTestDb();
  });

  // Setup: Create test customers and sample products
  await t.test('Setup: Create test users and inventory', async () => {
    customerA = await User.create({
      name: 'Order Customer A',
      email: `ordera_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    tokenA = generateToken(customerA);

    customerB = await User.create({
      name: 'Order Customer B',
      email: `orderb_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    tokenB = generateToken(customerB);

    testCategory = await Category.create({
      name: `Order Category ${timestamp}`,
      slug: `order-cat-${timestamp}`,
      description: 'Category for testing orders',
      isActive: true,
    });

    product1 = await Product.create({
      name: `Mechanical Keyboard ${timestamp}`,
      slug: `mech-keyboard-${timestamp}`,
      description: 'Tenkeyless RGB mechanical keyboard',
      price: 349900, // ₹3,499.00
      stock: 20,
      category: testCategory._id,
      isActive: true,
    });

    product2 = await Product.create({
      name: `Wireless Mouse ${timestamp}`,
      slug: `mouse-${timestamp}`,
      description: 'Ergonomic optical mouse',
      price: 129900, // ₹1,299.00
      stock: 15,
      category: testCategory._id,
      isActive: true,
    });

    scarceProduct = await Product.create({
      name: `Scarce Item ${timestamp}`,
      slug: `scarce-item-${timestamp}`,
      description: 'Only 2 in stock',
      price: 500000,
      stock: 2,
      category: testCategory._id,
      isActive: true,
    });
  });

  // Test 1: 401 Unauthorized for unauthenticated request
  await t.test('POST /api/orders rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingDetails: {
          fullName: 'Test User',
          phone: '9876543210',
          address: '123 Test St',
          city: 'Mumbai',
          pinCode: '400001',
        },
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  // Test 2: Reject empty cart checkout
  await t.test('POST /api/orders rejects checkout when cart is empty with 400', async () => {
    // customerA has an empty cart
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        shippingDetails: {
          fullName: 'Aarav Sharma',
          phone: '9876543210',
          address: '42 MG Road, Indiranagar',
          city: 'Bengaluru',
          pinCode: '560038',
        },
        paymentMethod: 'cod',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /empty/i);
  });

  // Test 3: Reject non-COD payment method
  await t.test('POST /api/orders rejects payment methods other than COD with 400', async () => {
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        shippingDetails: {
          fullName: 'Aarav Sharma',
          phone: '9876543210',
          address: '42 MG Road',
          city: 'Bengaluru',
          pinCode: '560038',
        },
        paymentMethod: 'card', // Only COD is permitted in Stage 6
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /cash on delivery/i);
  });

  // Test 4: Validate missing or invalid shipping fields
  await t.test('POST /api/orders validates all shipping details fields', async () => {
    // Add item to cart first
    await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ productId: product1._id.toString(), quantity: 1 }),
    });

    // Incomplete shipping details (missing phone, short address, invalid pin)
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        shippingDetails: {
          fullName: 'A', // too short
          phone: '123', // invalid
          address: 'No', // too short
          city: '', // empty
          pinCode: 'bad', // not numeric
        },
        paymentMethod: 'cod',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.ok(Array.isArray(data.errors));
    assert.ok(data.errors.length >= 4);
  });

  // Test 5: Reject order if stock is insufficient
  await t.test('POST /api/orders rejects order if quantity exceeds available stock', async () => {
    // Add scarceProduct (stock: 2) to cart with quantity 2
    await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ productId: scarceProduct._id.toString(), quantity: 2 }),
    });

    // Now artificially drop scarceProduct stock in DB to 1 (simulating concurrent depletion)
    scarceProduct.stock = 1;
    await scarceProduct.save();

    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        shippingDetails: {
          fullName: 'Aarav Sharma',
          phone: '9876543210',
          address: '42 MG Road, Indiranagar',
          city: 'Bengaluru',
          pinCode: '560038',
        },
        paymentMethod: 'cod',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /insufficient stock/i);

    // Remove scarce product from cart for subsequent tests
    const cartRes = await fetch(`${baseUrl}/cart`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const cartData = await cartRes.json();
    const scarceCartItem = cartData.cart.items.find(
      (item) => item.product._id === scarceProduct._id.toString()
    );
    if (scarceCartItem) {
      await fetch(`${baseUrl}/cart/${scarceCartItem._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
    }
  });

  // Test 6: Successful Checkout and Order Creation
  await t.test('POST /api/orders creates order, deducts stock safely, and clears cart', async () => {
    const initialP1Stock = (await Product.findById(product1._id)).stock; // 20
    const initialP2Stock = (await Product.findById(product2._id)).stock; // 15

    // Cart currently has 1 of product1. Let's add 2 of product2.
    await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ productId: product2._id.toString(), quantity: 2 }),
    });

    const expectedTotal = product1.price * 1 + product2.price * 2; // 349900*1 + 129900*2 = 609700 paise

    // Place Order
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        shippingDetails: {
          fullName: 'Aarav Sharma',
          phone: '9876543210',
          address: '42 MG Road, Indiranagar',
          city: 'Bengaluru',
          pinCode: '560038',
        },
        paymentMethod: 'cod',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.order);
    assert.ok(data.order.orderNumber.startsWith('SE-'));
    assert.equal(data.order.paymentMethod, 'cod');
    assert.ok(['placed', 'pending'].includes(data.order.orderStatus));
    assert.equal(data.order.totals.grandTotal, expectedTotal);
    assert.equal(data.order.items.length, 2);

    createdOrderId = data.order._id;

    // 1. Verify Inventory was deducted in database
    const updatedP1 = await Product.findById(product1._id);
    const updatedP2 = await Product.findById(product2._id);
    assert.equal(updatedP1.stock, initialP1Stock - 1);
    assert.equal(updatedP2.stock, initialP2Stock - 2);

    // 2. Verify Cart was cleared
    const checkCartRes = await fetch(`${baseUrl}/cart`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const checkCartData = await checkCartRes.json();
    assert.equal(checkCartData.cart.items.length, 0);
    assert.equal(checkCartData.cart.totalItems, 0);
  });

  // Test 7: GET /api/orders/:id retrieves order by ID and orderNumber
  await t.test('GET /api/orders/:id retrieves order details for owner', async () => {
    const res = await fetch(`${baseUrl}/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.order._id, createdOrderId);
    assert.equal(data.order.shippingDetails.fullName, 'Aarav Sharma');
  });

  // Test 8: Security - Customer B cannot access Customer A's order
  await t.test('GET /api/orders/:id rejects unauthorized customer access with 403', async () => {
    const res = await fetch(`${baseUrl}/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.match(data.message, /not authorized/i);
  });

  // Test 9: GET /api/orders returns customer's order history
  await t.test('GET /api/orders returns authenticated customer order list', async () => {
    const res = await fetch(`${baseUrl}/orders`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.count, 1);
    assert.equal(data.orders[0]._id, createdOrderId);
  });

  // Test 10: PATCH /api/orders/:id/cancel cancels placed order and restores stock exactly once
  await t.test('PATCH /api/orders/:id/cancel restores stock and marks status cancelled', async () => {
    const p1StockBeforeCancel = (await Product.findById(product1._id)).stock;
    const p2StockBeforeCancel = (await Product.findById(product2._id)).stock;

    const res = await fetch(`${baseUrl}/orders/${createdOrderId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.order.orderStatus, 'cancelled');

    // Verify stock is restored
    const p1StockAfter = (await Product.findById(product1._id)).stock;
    const p2StockAfter = (await Product.findById(product2._id)).stock;
    assert.equal(p1StockAfter, p1StockBeforeCancel + 1);
    assert.equal(p2StockAfter, p2StockBeforeCancel + 2);
  });

  // Test 11: Re-cancelling rejects double cancellation and prevents double stock restoration
  await t.test('PATCH /api/orders/:id/cancel prevents double cancellation and double stock restoration', async () => {
    const p1Stock = (await Product.findById(product1._id)).stock;

    const res = await fetch(`${baseUrl}/orders/${createdOrderId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /already/i);

    // Stock must NOT have changed
    const p1StockAfterSecondAttempt = (await Product.findById(product1._id)).stock;
    assert.equal(p1StockAfterSecondAttempt, p1Stock);
  });

  // Test 12: Cannot cancel shipped or delivered order
  await t.test('PATCH /api/orders/:id/cancel rejects cancellation of shipped and delivered orders', async () => {
    // Create an order directly in 'shipped' state
    const shippedOrder = await Order.create({
      user: customerA._id,
      orderNumber: `SE-TEST-SHIP-${timestamp}`,
      items: [
        {
          product: product1._id,
          name: product1.name,
          price: product1.price,
          quantity: 1,
          subtotal: product1.price,
        },
      ],
      shippingDetails: {
        fullName: 'Aarav Sharma',
        phone: '9876543210',
        address: '42 MG Road',
        city: 'Bengaluru',
        pinCode: '560038',
      },
      paymentMethod: 'cod',
      orderStatus: 'shipped',
      totals: {
        itemsTotal: product1.price,
        shippingFee: 0,
        tax: 0,
        grandTotal: product1.price,
      },
    });

    const res = await fetch(`${baseUrl}/orders/${shippedOrder._id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /shipped/i);

    await Order.findByIdAndDelete(shippedOrder._id);
  });

  // Test 13: Customer B cannot cancel Customer A's order
  await t.test('PATCH /api/orders/:id/cancel rejects unauthorized cancellation attempts with 403', async () => {
    const newPlacedOrder = await Order.create({
      user: customerA._id,
      orderNumber: `SE-TEST-AUTH-${timestamp}`,
      items: [
        {
          product: product1._id,
          name: product1.name,
          price: product1.price,
          quantity: 1,
          subtotal: product1.price,
        },
      ],
      shippingDetails: {
        fullName: 'Aarav Sharma',
        phone: '9876543210',
        address: '42 MG Road',
        city: 'Bengaluru',
        pinCode: '560038',
      },
      paymentMethod: 'cod',
      orderStatus: 'placed',
      totals: {
        itemsTotal: product1.price,
        shippingFee: 0,
        tax: 0,
        grandTotal: product1.price,
      },
    });

    const res = await fetch(`${baseUrl}/orders/${newPlacedOrder._id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.match(data.message, /not authorized/i);

    await Order.findByIdAndDelete(newPlacedOrder._id);
  });
});

