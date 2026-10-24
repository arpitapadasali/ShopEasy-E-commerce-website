import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';
import Review from '../src/models/Review.js';
import { generateToken } from '../src/utils/token.js';

test('Product Reviews & Ratings Test Suite (Feature 1)', async (t) => {
  await setupTestDb();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let customerUser1 = null;
  let customerToken1 = '';
  let customerUser2 = null;
  let customerToken2 = '';
  let adminUser = null;
  let adminToken = '';
  let testCategory = null;
  let testProduct1 = null;
  let testProduct2 = null;
  let verifiedOrder = null;

  t.after(async () => {
    if (customerUser1) await User.findByIdAndDelete(customerUser1._id);
    if (customerUser2) await User.findByIdAndDelete(customerUser2._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (testProduct1) await Product.findByIdAndDelete(testProduct1._id);
    if (testProduct2) await Product.findByIdAndDelete(testProduct2._id);
    if (testCategory) await Category.findByIdAndDelete(testCategory._id);
    if (verifiedOrder) await Order.findByIdAndDelete(verifiedOrder._id);
    await Review.deleteMany({});

    server.close();
    await teardownTestDb();
  });

  await t.test('Setup: Create test users, category, products, and order for verification', async () => {
    customerUser1 = await User.create({
      name: 'Alice Buyer',
      email: `alice_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    customerToken1 = generateToken(customerUser1);

    customerUser2 = await User.create({
      name: 'Bob Reviewer',
      email: `bob_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    customerToken2 = generateToken(customerUser2);

    adminUser = await User.create({
      name: 'Admin Moderator',
      email: `admin_mod_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'admin',
    });
    adminToken = generateToken(adminUser);

    testCategory = await Category.create({
      name: `Category ${timestamp}`,
      slug: `category-${timestamp}`,
      description: 'Test category description',
    });

    testProduct1 = await Product.create({
      name: `Test Product 1 ${timestamp}`,
      slug: `test-prod-1-${timestamp}`,
      description: 'Product 1 description',
      price: 150000,
      stock: 50,
      category: testCategory._id,
      rating: 0,
      numReviews: 0,
      isActive: true,
    });

    testProduct2 = await Product.create({
      name: `Test Product 2 Unreviewed ${timestamp}`,
      slug: `test-prod-2-${timestamp}`,
      description: 'Product 2 description',
      price: 250000,
      stock: 20,
      category: testCategory._id,
      rating: 0,
      numReviews: 0,
      isActive: true,
    });

    // Create a real completed order for customerUser1 buying testProduct1
    verifiedOrder = await Order.create({
      orderNumber: `ORD-REV-${timestamp}`,
      user: customerUser1._id,
      items: [
        {
          product: testProduct1._id,
          name: testProduct1.name,
          price: testProduct1.price,
          quantity: 1,
          subtotal: testProduct1.price,
        },
      ],
      shippingDetails: {
        fullName: 'Alice Buyer',
        address: '123 Test St',
        city: 'Mumbai',
        pinCode: '400001',
        phone: '9876543210',
      },
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      totals: {
        itemsTotal: testProduct1.price,
        shippingFee: 0,
        tax: 0,
        discount: 0,
        grandTotal: testProduct1.price,
      },
    });

    assert.ok(customerUser1._id);
    assert.ok(customerUser2._id);
    assert.ok(adminUser._id);
    assert.ok(testProduct1._id);
  });

  let createdReview1Id = '';

  await t.test('POST /api/products/:productId/reviews - Customer 1 writes review with Verified Purchase badge', async () => {
    const res = await fetch(`${baseUrl}/products/${testProduct1._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({
        rating: 5,
        title: 'Outstanding Quality!',
        comment: 'Exceeded all my expectations. Highly recommended to everyone.',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.review.rating, 5);
    assert.strictEqual(data.review.title, 'Outstanding Quality!');
    assert.strictEqual(data.review.isVerifiedPurchase, true); // verified from real Order!
    assert.strictEqual(data.review.status, 'approved');

    createdReview1Id = data.review._id;

    // Verify Product rating & review count updated
    const updatedProd = await Product.findById(testProduct1._id);
    assert.strictEqual(updatedProd.rating, 5);
    assert.strictEqual(updatedProd.numReviews, 1);
  });

  await t.test('POST /api/products/:productId/reviews - Customer 2 writes review without purchase (isVerifiedPurchase = false)', async () => {
    const res = await fetch(`${baseUrl}/products/${testProduct1._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken2}`,
      },
      body: JSON.stringify({
        rating: 3,
        title: 'Decent, but average',
        comment: 'Looks okay, but I think the price is a bit high for what it is.',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.review.rating, 3);
    assert.strictEqual(data.review.isVerifiedPurchase, false); // No order placed

    // Recalculated average: (5 + 3) / 2 = 4.0, numReviews = 2
    const updatedProd = await Product.findById(testProduct1._id);
    assert.strictEqual(updatedProd.rating, 4);
    assert.strictEqual(updatedProd.numReviews, 2);
  });

  await t.test('POST /api/products/:productId/reviews - Duplicate review rejection (409 Conflict)', async () => {
    const res = await fetch(`${baseUrl}/products/${testProduct1._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({
        rating: 4,
        title: 'Trying to review again',
        comment: 'This second review attempt should be rejected.',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.success, false);
    assert.match(data.message, /already reviewed/i);
  });

  await t.test('POST /api/products/:productId/reviews - Validation checks (invalid rating & missing fields)', async () => {
    // Missing token
    const resNoAuth = await fetch(`${baseUrl}/products/${testProduct1._id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5, title: 'Test', comment: 'Valid comment' }),
    });
    assert.strictEqual(resNoAuth.status, 401);

    // Rating out of range (> 5)
    const resInvalidRating = await fetch(`${baseUrl}/products/${testProduct2._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({ rating: 6, title: 'Invalid Rating', comment: 'Rating is 6' }),
    });
    assert.strictEqual(resInvalidRating.status, 400);

    // Empty title
    const resEmptyTitle = await fetch(`${baseUrl}/products/${testProduct2._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({ rating: 4, title: '', comment: 'Comment with empty title' }),
    });
    assert.strictEqual(resEmptyTitle.status, 400);
  });

  await t.test('GET /api/products/:productId/reviews - Fetch reviews list and rating breakdown distribution', async () => {
    const res = await fetch(`${baseUrl}/products/${testProduct1._id}/reviews`, {
      headers: {
        Authorization: `Bearer ${customerToken1}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.reviews.length, 2);
    assert.strictEqual(data.stats.rating, 4);
    assert.strictEqual(data.stats.numReviews, 2);
    assert.strictEqual(data.stats.distribution['5'].count, 1);
    assert.strictEqual(data.stats.distribution['5'].percentage, 50);
    assert.strictEqual(data.stats.distribution['3'].count, 1);
    assert.strictEqual(data.stats.distribution['3'].percentage, 50);
    assert.strictEqual(data.stats.distribution['1'].count, 0);
    assert.strictEqual(data.userHasReviewed, true);
    assert.strictEqual(data.userReview.title, 'Outstanding Quality!');
  });

  await t.test('GET /api/products/:productId/reviews - Product with 0 reviews returns safe defaults', async () => {
    const res = await fetch(`${baseUrl}/products/${testProduct2._id}/reviews`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.reviews.length, 0);
    assert.strictEqual(data.stats.rating, 0);
    assert.strictEqual(data.stats.numReviews, 0);
    assert.strictEqual(data.stats.distribution['5'].count, 0);
    assert.strictEqual(data.stats.distribution['5'].percentage, 0);
    assert.strictEqual(data.userHasReviewed, false);
  });

  await t.test('PUT /api/reviews/:reviewId - Unauthorized user cannot update someone else’s review (403)', async () => {
    const res = await fetch(`${baseUrl}/reviews/${createdReview1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken2}`, // Bob tries to edit Alice's review
      },
      body: JSON.stringify({
        rating: 1,
        title: 'Malicious edit',
        comment: 'Trying to tamper with review',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
  });

  await t.test('PUT /api/reviews/:reviewId - Customer updates own review and product rating recalculates', async () => {
    const res = await fetch(`${baseUrl}/reviews/${createdReview1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken1}`,
      },
      body: JSON.stringify({
        rating: 4, // Changed from 5 to 4
        title: 'Still Great Quality!',
        comment: 'Updated review comments after 2 weeks of usage.',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.review.rating, 4);

    // New average: (4 + 3) / 2 = 3.5
    const updatedProd = await Product.findById(testProduct1._id);
    assert.strictEqual(updatedProd.rating, 3.5);
    assert.strictEqual(updatedProd.numReviews, 2);
  });

  await t.test('DELETE /api/reviews/:reviewId - Unauthorized user cannot delete someone else’s review (403)', async () => {
    const res = await fetch(`${baseUrl}/reviews/${createdReview1Id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${customerToken2}`,
      },
    });

    assert.strictEqual(res.status, 403);
  });

  await t.test('Admin Review Management: GET /api/admin/reviews, Moderation & RBAC', async () => {
    // Non-admin forbidden
    const resCustomer = await fetch(`${baseUrl}/admin/reviews`, {
      headers: { Authorization: `Bearer ${customerToken1}` },
    });
    assert.strictEqual(resCustomer.status, 403);

    // Admin lists reviews
    const resAdmin = await fetch(`${baseUrl}/admin/reviews`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAdmin = await resAdmin.json();
    assert.strictEqual(resAdmin.status, 200);
    assert.strictEqual(dataAdmin.success, true);
    assert.strictEqual(dataAdmin.reviews.length >= 2, true);

    // Admin rejects a review (moderation)
    const resMod = await fetch(`${baseUrl}/admin/reviews/${createdReview1Id}/moderation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'rejected' }),
    });
    const dataMod = await resMod.json();
    assert.strictEqual(resMod.status, 200);
    assert.strictEqual(dataMod.review.status, 'rejected');

    // Since Alice's review is now rejected, only Bob's review (rating 3) is approved
    const prodAfterReject = await Product.findById(testProduct1._id);
    assert.strictEqual(prodAfterReject.rating, 3);
    assert.strictEqual(prodAfterReject.numReviews, 1);

    // Admin approves it back
    await fetch(`${baseUrl}/admin/reviews/${createdReview1Id}/moderation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'approved' }),
    });
  });

  await t.test('DELETE /api/reviews/:reviewId - Customer deletes own review and product rating recalculates', async () => {
    const res = await fetch(`${baseUrl}/reviews/${createdReview1Id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${customerToken1}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    // Only Bob's review (rating 3) remains
    const prodAfterDelete = await Product.findById(testProduct1._id);
    assert.strictEqual(prodAfterDelete.rating, 3);
    assert.strictEqual(prodAfterDelete.numReviews, 1);
  });
});
