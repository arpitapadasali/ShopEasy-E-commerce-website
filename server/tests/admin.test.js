import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';
import { generateToken } from '../src/utils/token.js';

test('Administrator Dashboard & Analytics API Test Suite (Stage 8)', async (t) => {
  await setupTestDb();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let adminUser = null;
  let adminToken = '';
  let customerUser = null;
  let customerToken = '';
  let testCategory = null;
  let normalProduct = null;
  let lowStockProduct = null;
  let activeOrder = null;
  let cancelledOrder = null;

  t.after(async () => {
    // Clean up created entities
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (customerUser) await User.findByIdAndDelete(customerUser._id);
    if (normalProduct) await Product.findByIdAndDelete(normalProduct._id);
    if (lowStockProduct) await Product.findByIdAndDelete(lowStockProduct._id);
    if (testCategory) await Category.findByIdAndDelete(testCategory._id);
    if (activeOrder) await Order.findByIdAndDelete(activeOrder._id);
    if (cancelledOrder) await Order.findByIdAndDelete(cancelledOrder._id);

    server.close();
    await teardownTestDb();
  });

  // Setup: Create admin, customer, products, and test orders
  await t.test('Setup: Create admin, customer, products, and orders', async () => {
    adminUser = await User.create({
      name: 'Admin Dashboard Tester',
      email: `admin_dash_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'admin',
    });
    adminToken = generateToken(adminUser);

    customerUser = await User.create({
      name: 'Regular Customer Tester',
      email: `cust_dash_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      phone: '9876543210',
      city: 'Delhi',
      role: 'customer',
    });
    customerToken = generateToken(customerUser);

    testCategory = await Category.create({
      name: `Dashboard Category ${timestamp}`,
      slug: `dash-cat-${timestamp}`,
      isActive: true,
    });

    normalProduct = await Product.create({
      name: `Normal Stock Item ${timestamp}`,
      slug: `normal-item-${timestamp}`,
      description: 'Test normal product description',
      price: 200000, // ₹2,000.00
      stock: 50,
      category: testCategory._id,
      isActive: true,
    });

    lowStockProduct = await Product.create({
      name: `Low Stock Item ${timestamp}`,
      slug: `low-stock-item-${timestamp}`,
      description: 'Test low stock product description',
      price: 500000, // ₹5,000.00
      stock: 2, // Stock <= 5 trigger
      category: testCategory._id,
      isActive: true,
    });

    // 1 Active order (Placed, ₹2,000)
    activeOrder = await Order.create({
      user: customerUser._id,
      orderNumber: `SE-ADM-ACT-${timestamp}`,
      items: [
        {
          product: normalProduct._id,
          name: normalProduct.name,
          price: normalProduct.price,
          quantity: 1,
          subtotal: normalProduct.price,
        },
      ],
      shippingDetails: {
        fullName: 'Test Customer',
        phone: '9876543210',
        address: '123 Main St',
        city: 'Delhi',
        pinCode: '110001',
      },
      paymentMethod: 'cod',
      orderStatus: 'placed',
      totals: {
        itemsTotal: 200000,
        shippingFee: 0,
        tax: 0,
        grandTotal: 200000,
      },
    });

    // 1 Cancelled order (Cancelled, ₹5,000) - MUST be excluded from active sales!
    cancelledOrder = await Order.create({
      user: customerUser._id,
      orderNumber: `SE-ADM-CAN-${timestamp}`,
      items: [
        {
          product: lowStockProduct._id,
          name: lowStockProduct.name,
          price: lowStockProduct.price,
          quantity: 1,
          subtotal: lowStockProduct.price,
        },
      ],
      shippingDetails: {
        fullName: 'Test Customer',
        phone: '9876543210',
        address: '123 Main St',
        city: 'Delhi',
        pinCode: '110001',
      },
      paymentMethod: 'cod',
      orderStatus: 'cancelled',
      totals: {
        itemsTotal: 500000,
        shippingFee: 0,
        tax: 0,
        grandTotal: 500000,
      },
    });
  });

  // Test 1: Security - 401 Unauthorized for unauthenticated requests
  await t.test('GET /api/admin/stats rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/admin/stats`);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  // Test 2: Security - 403 Forbidden for customer role on all admin routes
  await t.test('Admin APIs reject customers with 403 Forbidden', async () => {
    // Stats
    const resStats = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(resStats.status, 403);

    // Orders
    const resOrders = await fetch(`${baseUrl}/admin/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(resOrders.status, 403);

    // Customers
    const resCustomers = await fetch(`${baseUrl}/admin/customers`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(resCustomers.status, 403);
  });

  // Test 3: GET /api/admin/stats returns live aggregated metrics
  await t.test('GET /api/admin/stats returns accurate metrics and excludes cancelled sales', async () => {
    const res = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.stats);

    const stats = data.stats;
    assert.ok(stats.totalProducts >= 2);
    assert.ok(stats.totalCustomers >= 1);
    assert.ok(stats.totalOrders >= 2);

    // Rule Verification: totalSales must NOT include cancelled orders (only active/placed/delivered)
    assert.ok(stats.totalSales >= 200000);
    assert.ok(stats.cancelledSales >= 500000);

    // Low stock products alert array
    assert.ok(Array.isArray(stats.lowStockProducts));
    const foundLowStock = stats.lowStockProducts.some(
      (p) => p._id.toString() === lowStockProduct._id.toString()
    );
    assert.equal(foundLowStock, true, 'Low stock product should be flagged in alert list');

    // Recent orders array
    assert.ok(Array.isArray(stats.recentOrders));
    assert.ok(stats.recentOrders.length >= 2);
  });

  // Test 4: GET /api/admin/orders returns orders with customer details
  await t.test('GET /api/admin/orders retrieves all system orders with pagination', async () => {
    const res = await fetch(`${baseUrl}/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.orders));
    assert.ok(data.total >= 2);
    assert.ok(data.orders.some((o) => o._id === activeOrder._id.toString()));
  });

  // Test 5: GET /api/admin/customers returns customers and strips password hashes
  await t.test('GET /api/admin/customers lists customers without exposing passwordHash', async () => {
    const res = await fetch(`${baseUrl}/admin/customers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.customers));
    assert.ok(data.customers.length >= 1);

    // Verify passwordHash is never returned
    data.customers.forEach((customer) => {
      assert.equal(customer.passwordHash, undefined, 'passwordHash must never be exposed');
      assert.equal(customer.role, undefined);
    });
  });

  // Test 6: GET /api/admin/products with filtering and low-stock queries
  await t.test('GET /api/admin/products supports search, category, and low stock filtering', async () => {
    // 6a: Search by product name
    const searchRes = await fetch(`${baseUrl}/admin/products?search=${encodeURIComponent('Low Stock')}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchData = await searchRes.json();
    assert.equal(searchRes.status, 200);
    assert.ok(searchData.products.some((p) => p._id === lowStockProduct._id.toString()));

    // 6b: Filter by stock <= 5
    const stockRes = await fetch(`${baseUrl}/admin/products?stockLt=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const stockData = await stockRes.json();
    assert.equal(stockRes.status, 200);
    assert.ok(stockData.products.every((p) => p.stock <= 5));
    assert.ok(stockData.products.some((p) => p._id === lowStockProduct._id.toString()));
  });

  // Test 7: GET /api/admin/categories returns categories with calculated product counts
  await t.test('GET /api/admin/categories returns categories with accurate product counts', async () => {
    const res = await fetch(`${baseUrl}/admin/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data.categories));

    const foundCategory = data.categories.find((c) => c._id === testCategory._id.toString());
    assert.ok(foundCategory);
    assert.equal(foundCategory.productCount, 2, 'Category should reflect 2 assigned test products');
  });

  // Test 8: Category deletion safety check prevents orphan product references
  await t.test('DELETE /api/categories/:id is rejected with 400 when products reference the category', async () => {
    const res = await fetch(`${baseUrl}/categories/${testCategory._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.ok(data.message.includes('product(s) are currently assigned'));
  });

  // Test 9: PATCH /api/admin/orders/:id/status updates status and rejects invalid transitions
  await t.test('PATCH /api/admin/orders/:id/status manages status transitions and validates rules', async () => {
    // 9a: Reject invalid status value
    const invRes = await fetch(`${baseUrl}/admin/orders/${activeOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'flying' }),
    });
    assert.equal(invRes.status, 400);

    // 9b: Valid transition: placed -> processing
    const procRes = await fetch(`${baseUrl}/admin/orders/${activeOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'processing' }),
    });
    const procData = await procRes.json();
    assert.equal(procRes.status, 200);
    assert.equal(procData.order.orderStatus, 'processing');

    // 9c: Valid transition: processing -> shipped
    const shipRes = await fetch(`${baseUrl}/admin/orders/${activeOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'shipped' }),
    });
    assert.equal(shipRes.status, 200);

    // 9d: Rejection rule: shipped order cannot be cancelled
    const cancelShippedRes = await fetch(`${baseUrl}/admin/orders/${activeOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    assert.equal(cancelShippedRes.status, 400);
    const cancelShippedData = await cancelShippedRes.json();
    assert.ok(cancelShippedData.message.includes('already shipped'));

    // 9e: Valid transition: shipped -> delivered (sets paymentStatus to paid for COD)
    const delivRes = await fetch(`${baseUrl}/admin/orders/${activeOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'delivered' }),
    });
    const delivData = await delivRes.json();
    assert.equal(delivRes.status, 200);
    assert.equal(delivData.order.orderStatus, 'delivered');
    assert.equal(delivData.order.paymentStatus, 'paid');

    // 9f: Rejection rule: delivered order cannot be modified
    const postDelivRes = await fetch(`${baseUrl}/admin/orders/${activeOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'shipped' }),
    });
    assert.equal(postDelivRes.status, 400);
  });

  // Test 10: Admin order cancellation restores product stock
  await t.test('Admin cancelling an order restores inventory stock', async () => {
    // Create a new placed order for this test
    const initialStock = normalProduct.stock; // 50
    const cancelTestOrder = await Order.create({
      user: customerUser._id,
      orderNumber: `SE-ADM-RESTOCK-${timestamp}`,
      items: [
        {
          product: normalProduct._id,
          name: normalProduct.name,
          price: normalProduct.price,
          quantity: 3,
          subtotal: normalProduct.price * 3,
        },
      ],
      shippingDetails: {
        fullName: 'Restock Tester',
        phone: '9876543210',
        address: '123 Main St',
        city: 'Delhi',
        pinCode: '110001',
      },
      paymentMethod: 'cod',
      orderStatus: 'placed',
      totals: {
        itemsTotal: normalProduct.price * 3,
        shippingFee: 0,
        tax: 0,
        grandTotal: normalProduct.price * 3,
      },
    });

    const cancelRes = await fetch(`${baseUrl}/admin/orders/${cancelTestOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    const cancelData = await cancelRes.json();
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelData.order.orderStatus, 'cancelled');

    // Verify stock was incremented by 3
    const refreshedProduct = await Product.findById(normalProduct._id);
    assert.equal(refreshedProduct.stock, initialStock + 3);

    // Clean up
    await Order.findByIdAndDelete(cancelTestOrder._id);
  });
});
