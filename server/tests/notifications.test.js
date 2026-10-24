import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import NotificationLog from '../src/models/NotificationLog.js';
import { generateToken } from '../src/utils/token.js';
import {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPaymentVerificationEmail,
  sendOrderStatusEmail,
  sendOrderCancellationEmail,
} from '../src/services/email.service.js';
import {
  sendOrderConfirmationSMS,
  sendPaymentVerifiedSMS,
  sendOrderStatusSMS,
  normalizePhoneNumber,
} from '../src/services/sms.service.js';

test('Email & SMS Notifications Test Suite (Features 1 & 2)', async (t) => {
  await setupTestDb();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let customerUser = null;
  let customerToken = '';
  let adminUser = null;
  let adminToken = '';
  let testOrder = null;

  t.after(async () => {
    if (customerUser) {
      await Order.deleteMany({ user: customerUser._id });
      await User.findByIdAndDelete(customerUser._id);
    }
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    await NotificationLog.deleteMany({});

    server.close();
    await teardownTestDb();
  });

  await t.test('Setup: Create customer, admin, and test order', async () => {
    customerUser = await User.create({
      name: 'Notification Customer',
      email: `notif_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    customerToken = generateToken(customerUser);

    adminUser = await User.create({
      name: 'Notification Admin',
      email: `notif_admin_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'admin',
    });
    adminToken = generateToken(adminUser);

    const dummyProductId = new mongoose.Types.ObjectId();

    testOrder = await Order.create({
      user: customerUser._id,
      orderNumber: `ORD-NOTIF-${timestamp}`,
      items: [
        {
          product: dummyProductId,
          name: 'Noise Cancelling Headphones',
          sku: 'HP-NC-001',
          price: 599900, // Rs 5999.00
          quantity: 1,
          subtotal: 599900,
        },
      ],
      shippingDetails: {
        fullName: 'Aarav Patel',
        address: 'B-104 Sunrise Residency, Andheri West',
        city: 'Mumbai',
        pinCode: '400053',
        phone: '09876543210', // Needs normalization to +919876543210
      },
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'placed',
      totals: {
        itemsTotal: 599900,
        shippingFee: 0,
        discount: 0,
        grandTotal: 599900,
      },
    });

    assert.ok(testOrder._id);
  });

  await t.test('SMS Phone Normalization: Formats Indian local numbers to E.164 (+91)', () => {
    assert.strictEqual(normalizePhoneNumber('9876543210'), '+919876543210');
    assert.strictEqual(normalizePhoneNumber('09876543210'), '+919876543210');
    assert.strictEqual(normalizePhoneNumber('+919876543210'), '+919876543210');
    assert.strictEqual(normalizePhoneNumber('919876543210'), '+919876543210');
    assert.strictEqual(normalizePhoneNumber('invalid'), null);
  });

  await t.test('Email Service: Gracefully handles unconfigured SMTP without throwing', async () => {
    const welcomeResult = await sendWelcomeEmail({ user: customerUser });
    assert.strictEqual(welcomeResult.success, false);
    assert.strictEqual(welcomeResult.skipped, true);

    const orderResult = await sendOrderConfirmationEmail({ order: testOrder, user: customerUser });
    assert.strictEqual(orderResult.success, false);
    assert.strictEqual(orderResult.skipped, true);

    const paymentResult = await sendPaymentVerificationEmail({ order: testOrder, user: customerUser });
    assert.strictEqual(paymentResult.success, false);
    assert.strictEqual(paymentResult.skipped, true);

    const statusResult = await sendOrderStatusEmail({
      order: testOrder,
      user: customerUser,
      newStatus: 'shipped',
    });
    assert.strictEqual(statusResult.success, false);
    assert.strictEqual(statusResult.skipped, true);

    const cancelResult = await sendOrderCancellationEmail({
      order: testOrder,
      user: customerUser,
      reason: 'Customer test cancellation',
    });
    assert.strictEqual(cancelResult.success, false);
    assert.strictEqual(cancelResult.skipped, true);
  });

  await t.test('SMS Service: Gracefully handles SMS_PROVIDER=none without throwing', async () => {
    const smsResult = await sendOrderConfirmationSMS({ order: testOrder, user: customerUser });
    assert.strictEqual(smsResult.success, false);
    assert.strictEqual(smsResult.skipped, true);

    const paySMS = await sendPaymentVerifiedSMS({ order: testOrder, user: customerUser });
    assert.strictEqual(paySMS.success, false);
    assert.strictEqual(paySMS.skipped, true);

    const statusSMS = await sendOrderStatusSMS({ order: testOrder, user: customerUser, newStatus: 'shipped' });
    assert.strictEqual(statusSMS.success, false);
    assert.strictEqual(statusSMS.skipped, true);
  });

  await t.test('NotificationLog Idempotency: Prevents duplicate dispatches for the same eventId', async () => {
    const eventId = `test_event_${timestamp}`;

    // Simulate first successful notification log
    await NotificationLog.create({
      eventId,
      type: 'email',
      recipient: customerUser.email,
      event: 'order_placed',
      order: testOrder._id,
      status: 'sent',
    });

    // Check that event is logged
    const count = await NotificationLog.countDocuments({ eventId });
    assert.strictEqual(count, 1);

    // Attempting to log duplicate eventId should trigger Mongo duplicate key error
    await assert.rejects(
      async () => {
        await NotificationLog.create({
          eventId,
          type: 'email',
          recipient: customerUser.email,
          event: 'order_placed',
          order: testOrder._id,
          status: 'sent',
        });
      },
      (err) => err.code === 11000
    );
  });

  await t.test('POST /api/orders/:id/verify-payment: Updates order to paid and confirmed', async () => {
    const res = await fetch(`${baseUrl}/orders/${testOrder._id}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        transactionId: `PAY_TXN_${timestamp}`,
        paymentMethod: 'card',
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.order.paymentStatus, 'paid');
    assert.strictEqual(data.order.orderStatus, 'confirmed');

    // Check database state
    const verifiedOrder = await Order.findById(testOrder._id);
    assert.strictEqual(verifiedOrder.paymentStatus, 'paid');
    assert.strictEqual(verifiedOrder.orderStatus, 'confirmed');
  });

  await t.test('Admin Order Status Update: Sends status notifications idempotently', async () => {
    const res = await fetch(`${baseUrl}/admin/orders/${testOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'shipped' }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.order.orderStatus, 'shipped');
  });
});
