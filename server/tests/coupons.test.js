import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Cart from '../src/models/Cart.js';
import Order from '../src/models/Order.js';
import Coupon from '../src/models/Coupon.js';
import { generateToken } from '../src/utils/token.js';

test('Coupons & Discounts Test Suite (Feature 4)', async (t) => {
  await setupTestDb();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let customerUser = null;
  let customerToken = '';
  let secondCustomer = null;
  let secondToken = '';
  let adminUser = null;
  let adminToken = '';
  let testCategory = null;
  let testProduct = null;

  t.after(async () => {
    if (customerUser) {
      await Cart.deleteOne({ user: customerUser._id });
      await Order.deleteMany({ user: customerUser._id });
      await User.findByIdAndDelete(customerUser._id);
    }
    if (secondCustomer) {
      await Cart.deleteOne({ user: secondCustomer._id });
      await Order.deleteMany({ user: secondCustomer._id });
      await User.findByIdAndDelete(secondCustomer._id);
    }
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (testProduct) await Product.findByIdAndDelete(testProduct._id);
    if (testCategory) await Category.findByIdAndDelete(testCategory._id);
    await Coupon.deleteMany({ code: { $regex: new RegExp(`^TEST_`, 'i') } });

    server.close();
    await teardownTestDb();
  });

  await t.test('Setup: Create test users and inventory', async () => {
    customerUser = await User.create({
      name: 'Coupon Customer',
      email: `coupon_cust_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    customerToken = generateToken(customerUser);

    secondCustomer = await User.create({
      name: 'Second Customer',
      email: `second_cust_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    secondToken = generateToken(secondCustomer);

    adminUser = await User.create({
      name: 'Coupon Admin',
      email: `coupon_admin_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'admin',
    });
    adminToken = generateToken(adminUser);

    testCategory = await Category.create({
      name: `Category ${timestamp}`,
      slug: `category-${timestamp}`,
      description: 'Test category for coupons',
    });

    testProduct = await Product.create({
      name: 'Coupon Test Item',
      slug: `coupon-test-item-${timestamp}`,
      description: 'Item to test coupon checkout',
      price: 100000, // Rs 1000.00
      category: testCategory._id,
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
      isActive: true,
    });

    assert.ok(customerToken);
    assert.ok(adminToken);
  });

  await t.test('POST /api/coupons/validate: Validates active percentage coupon with cap', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    await Coupon.create({
      code: `TEST_PERC_${timestamp}`,
      discountType: 'percentage',
      discountValue: 20, // 20%
      minOrderAmount: 50000, // Rs 500
      maxDiscountAmount: 15000, // Rs 150 cap
      expiryDate: futureDate,
      isActive: true,
    });

    // Subtotal 1000.00 (100000 paise) -> 20% = 20000 paise, capped at 15000 paise
    const res = await fetch(`${baseUrl}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        code: `TEST_PERC_${timestamp}`,
        subtotal: 100000,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.discount, 15000); // capped at 15000 paise
    assert.strictEqual(data.newTotal, 85000);
  });

  await t.test('POST /api/coupons/validate: Validates fixed discount coupon', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    await Coupon.create({
      code: `TEST_FIXED_${timestamp}`,
      discountType: 'fixed',
      discountValue: 20000, // Rs 200
      minOrderAmount: 50000, // Rs 500
      expiryDate: futureDate,
      isActive: true,
    });

    const res = await fetch(`${baseUrl}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        code: `test_fixed_${timestamp}`, // Case-insensitive test
        subtotal: 100000,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.discount, 20000);
    assert.strictEqual(data.newTotal, 80000);
  });

  await t.test('POST /api/coupons/validate: Rejects subtotal below minOrderAmount', async () => {
    const res = await fetch(`${baseUrl}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        code: `TEST_FIXED_${timestamp}`,
        subtotal: 30000, // Rs 300 < min Rs 500
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.toLowerCase().includes('minimum order'));
  });

  await t.test('POST /api/coupons/validate: Rejects expired coupon', async () => {
    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 30);
    const pastExpiry = new Date();
    pastExpiry.setDate(pastExpiry.getDate() - 5);

    await Coupon.create({
      code: `TEST_EXPIRED_${timestamp}`,
      discountType: 'percentage',
      discountValue: 15,
      startDate: pastStart,
      expiryDate: pastExpiry,
      isActive: true,
    });

    const res = await fetch(`${baseUrl}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        code: `TEST_EXPIRED_${timestamp}`,
        subtotal: 100000,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.toLowerCase().includes('expired'));
  });

  await t.test('POST /api/coupons/validate: Rejects inactive coupon', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    await Coupon.create({
      code: `TEST_INACTIVE_${timestamp}`,
      discountType: 'percentage',
      discountValue: 10,
      expiryDate: futureDate,
      isActive: false,
    });

    const res = await fetch(`${baseUrl}/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        code: `TEST_INACTIVE_${timestamp}`,
        subtotal: 100000,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.toLowerCase().includes('inactive'));
  });

  await t.test('Order Creation with Coupon: Applies discount and records coupon usage', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const coupon = await Coupon.create({
      code: `TEST_ORDER_${timestamp}`,
      discountType: 'percentage',
      discountValue: 10, // 10%
      expiryDate: futureDate,
      usageLimit: 5,
      userUsageLimit: 1,
      isActive: true,
    });

    // Populate customer cart
    await Cart.findOneAndUpdate(
      { user: customerUser._id },
      {
        user: customerUser._id,
        items: [{ product: testProduct._id, quantity: 1, price: 100000 }],
      },
      { upsert: true }
    );

    // Place order with couponCode
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        shippingDetails: {
          fullName: 'Coupon Tester',
          address: '42 Baker Street',
          city: 'Mumbai',
          pinCode: '400001',
          phone: '+919876543210',
        },
        paymentMethod: 'cod',
        couponCode: `TEST_ORDER_${timestamp}`,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.order.couponCode, `TEST_ORDER_${timestamp}`);
    assert.strictEqual(data.order.totals.discount, 10000); // 10% of 100000 paise = 10000 paise (Rs 100)
    assert.strictEqual(data.order.totals.grandTotal, 90000); // Rs 900.00

    // Check that coupon usage was recorded
    const updatedCoupon = await Coupon.findById(coupon._id);
    assert.strictEqual(updatedCoupon.usedCount, 1);
    const userEntry = updatedCoupon.usersUsed.find((u) => u.user.equals(customerUser._id));
    assert.ok(userEntry);
    assert.strictEqual(userEntry.count, 1);

    // Second order with same coupon by same customer should be rejected due to userUsageLimit=1
    await Cart.findOneAndUpdate(
      { user: customerUser._id },
      {
        user: customerUser._id,
        items: [{ product: testProduct._id, quantity: 1, price: 100000 }],
      },
      { upsert: true }
    );

    const secondRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        shippingDetails: {
          fullName: 'Coupon Tester',
          address: '42 Baker Street',
          city: 'Mumbai',
          pinCode: '400001',
          phone: '+919876543210',
        },
        paymentMethod: 'cod',
        couponCode: `TEST_ORDER_${timestamp}`,
      }),
    });

    const secondData = await secondRes.json();
    assert.strictEqual(secondRes.status, 400);
    assert.ok(
      secondData.message.toLowerCase().includes('maximum allowed number of times') ||
      secondData.message.toLowerCase().includes('already redeemed')
    );

    // Cancelling the first order should release the coupon usage
    const cancelRes = await fetch(`${baseUrl}/orders/${data.order._id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ reason: 'Testing coupon release' }),
    });

    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelRes.status, 200);

    const releasedCoupon = await Coupon.findById(coupon._id);
    assert.strictEqual(releasedCoupon.usedCount, 0);
    const releasedUserEntry = releasedCoupon.usersUsed.find((u) => u.user.equals(customerUser._id));
    assert.strictEqual(releasedUserEntry.count, 0);
  });

  await t.test('Admin Coupon Operations: Full CRUD and RBAC enforcement', async () => {
    // 1. Customer cannot access admin coupon endpoints (RBAC 403)
    const forbiddenRes = await fetch(`${baseUrl}/admin/coupons`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(forbiddenRes.status, 403);

    // 2. Admin can create a new coupon
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45);

    const createRes = await fetch(`${baseUrl}/admin/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: `ADMIN_COUPON_${timestamp}`,
        description: 'Created by Admin Test',
        discountType: 'fixed',
        discountValue: 15000, // Rs 150.00
        minOrderAmount: 40000, // Rs 400.00
        expiryDate: futureDate.toISOString(),
        usageLimit: 100,
        userUsageLimit: 2,
        isActive: true,
      }),
    });

    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createData.success, true);
    const createdCouponId = createData.coupon._id;

    // 3. Admin can list coupons
    const listRes = await fetch(`${baseUrl}/admin/coupons`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listData.success, true);
    assert.ok(listData.coupons.some((c) => c._id === createdCouponId));

    // 4. Admin can toggle coupon active status
    const toggleRes = await fetch(`${baseUrl}/admin/coupons/${createdCouponId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const toggleData = await toggleRes.json();
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleData.coupon.isActive, false);

    // 5. Admin can delete coupon
    const deleteRes = await fetch(`${baseUrl}/admin/coupons/${createdCouponId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteData = await deleteRes.json();
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteData.success, true);

    const deleted = await Coupon.findById(createdCouponId);
    assert.strictEqual(deleted, null);
  });
});
