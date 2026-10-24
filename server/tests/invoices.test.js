import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';
import { generateToken } from '../src/utils/token.js';
import { generateInvoicePDF, generateInvoiceNumber } from '../src/services/invoice.service.js';

test('Downloadable PDF Invoices Test Suite (Feature 3)', async (t) => {
  await setupTestDb();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let ownerUser = null;
  let ownerToken = '';
  let otherUser = null;
  let otherToken = '';
  let adminUser = null;
  let adminToken = '';
  let testOrder = null;

  t.after(async () => {
    if (ownerUser) {
      await Order.deleteMany({ user: ownerUser._id });
      await User.findByIdAndDelete(ownerUser._id);
    }
    if (otherUser) {
      await Order.deleteMany({ user: otherUser._id });
      await User.findByIdAndDelete(otherUser._id);
    }
    if (adminUser) await User.findByIdAndDelete(adminUser._id);

    server.close();
    await teardownTestDb();
  });

  await t.test('Setup: Create users and test order for invoice generation', async () => {
    ownerUser = await User.create({
      name: 'Invoice Customer',
      email: `inv_owner_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    ownerToken = generateToken(ownerUser);

    otherUser = await User.create({
      name: 'Unrelated Customer',
      email: `inv_other_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    otherToken = generateToken(otherUser);

    adminUser = await User.create({
      name: 'Invoice Admin',
      email: `inv_admin_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'admin',
    });
    adminToken = generateToken(adminUser);

    const dummyProductId1 = new mongoose.Types.ObjectId();
    const dummyProductId2 = new mongoose.Types.ObjectId();

    testOrder = await Order.create({
      user: ownerUser._id,
      orderNumber: `ORD-INV-${timestamp}`,
      items: [
        {
          product: dummyProductId1,
          name: 'Wireless Ergonomic Keyboard',
          sku: 'KB-ERG-01',
          price: 249900, // Rs 2499.00
          quantity: 2,
          subtotal: 499800,
          imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
        },
        {
          product: dummyProductId2,
          name: 'Optical Gaming Mouse',
          sku: 'MS-OPT-02',
          price: 99900, // Rs 999.00
          quantity: 1,
          subtotal: 99900,
          imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
        },
      ],
      shippingDetails: {
        fullName: 'Rajesh Sharma',
        address: 'Flat 402, Sea Green Apts, Worli',
        city: 'Mumbai',
        pinCode: '400018',
        phone: '+919876543210',
      },
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderStatus: 'placed',
      totals: {
        itemsTotal: 599700,
        shippingFee: 0,
        discount: 50000, // Rs 500 coupon discount
        grandTotal: 549700,
      },
      couponCode: 'WELCOME500',
    });

    assert.ok(testOrder._id);
  });

  await t.test('Invoice Service: generateInvoicePDF produces valid PDF buffer', async () => {
    const pdfBuffer = await generateInvoicePDF(testOrder);
    assert.ok(Buffer.isBuffer(pdfBuffer));
    assert.ok(pdfBuffer.length > 1000);
    // PDF files always begin with the magic header bytes "%PDF-"
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    assert.strictEqual(header, '%PDF-');
  });

  await t.test('Invoice Number Generation: creates formatted sequence INV-YYYYMMDD-XXXX', () => {
    const invNumber = generateInvoiceNumber();
    assert.match(invNumber, /^INV-\d{8}-[A-Z0-9]{4}$/);
  });

  await t.test('GET /api/orders/:id/invoice: Order owner can download their invoice (200)', async () => {
    const res = await fetch(`${baseUrl}/orders/${testOrder._id}/invoice`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type');
    assert.ok(contentType.includes('application/pdf'));

    const disposition = res.headers.get('content-disposition');
    assert.ok(disposition.includes('attachment'));
    assert.ok(disposition.includes('invoice-'));
    assert.ok(disposition.includes('.pdf'));

    const buffer = Buffer.from(await res.arrayBuffer());
    assert.ok(buffer.length > 500);
    assert.strictEqual(buffer.slice(0, 5).toString('ascii'), '%PDF-');

    // Verify invoice number and date got persisted on order
    const updatedOrder = await Order.findById(testOrder._id);
    assert.ok(updatedOrder.invoiceNumber);
    assert.ok(updatedOrder.invoiceDate);
  });

  await t.test('GET /api/orders/:id/invoice: Idempotency preserves existing invoice number', async () => {
    const orderBefore = await Order.findById(testOrder._id);
    const initialInvoiceNumber = orderBefore.invoiceNumber;
    const initialInvoiceDate = orderBefore.invoiceDate.toISOString();

    const res = await fetch(`${baseUrl}/orders/${testOrder._id}/invoice`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(res.status, 200);

    const orderAfter = await Order.findById(testOrder._id);
    assert.strictEqual(orderAfter.invoiceNumber, initialInvoiceNumber);
    assert.strictEqual(orderAfter.invoiceDate.toISOString(), initialInvoiceDate);
  });

  await t.test('GET /api/orders/:id/invoice: Administrator can download invoice for any customer (200)', async () => {
    const res = await fetch(`${baseUrl}/orders/${testOrder._id}/invoice`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/pdf'));
  });

  await t.test('GET /api/orders/:id/invoice: Unauthorized customer cannot access another users invoice (403)', async () => {
    const res = await fetch(`${baseUrl}/orders/${testOrder._id}/invoice`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('not authorized'));
  });

  await t.test('GET /api/orders/:id/invoice: Unauthenticated request is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/orders/${testOrder._id}/invoice`);
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/orders/:id/invoice: Non-existent order returns 404', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await fetch(`${baseUrl}/orders/${fakeId}/invoice`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 404);
  });
});
