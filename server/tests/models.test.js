import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { User, Category, Product, Cart, Order } from '../src/models/index.js';

test('User Model: enforces required fields and valid email', async () => {
  const invalidUser = new User({});
  const err = invalidUser.validateSync();
  assert.ok(err.errors.name);
  assert.ok(err.errors.email);
  assert.ok(err.errors.passwordHash);

  const invalidEmailUser = new User({
    name: 'Test User',
    email: 'not-an-email',
    passwordHash: 'dummyhash',
  });
  const emailErr = invalidEmailUser.validateSync();
  assert.ok(emailErr.errors.email);

  const validUser = new User({
    name: 'Valid Customer',
    email: 'Customer@Example.com',
    passwordHash: 'secret_hashed_value',
    role: 'customer',
  });
  assert.equal(validUser.email, 'customer@example.com'); // Lowercase check
  const json = validUser.toJSON();
  assert.equal(json.passwordHash, undefined); // Sensitive data stripping
});

test('Category Model: requires name and slug', async () => {
  const invalidCategory = new Category({});
  const err = invalidCategory.validateSync();
  assert.ok(err.errors.name);
  assert.ok(err.errors.slug);

  const validCategory = new Category({
    name: 'Gadgets',
    slug: 'GADGETS',
  });
  assert.equal(validCategory.slug, 'gadgets'); // Lowercase check
  assert.equal(validCategory.isActive, true);
});

test('Product Model: requires price in integer paise and category reference', async () => {
  const invalidProduct = new Product({});
  const err = invalidProduct.validateSync();
  assert.ok(err.errors.name);
  assert.ok(err.errors.slug);
  assert.ok(err.errors.description);
  assert.ok(err.errors.price);
  assert.ok(err.errors.category);

  // Reject float price (paise must be integer)
  const floatProduct = new Product({
    name: 'Wireless Mouse',
    slug: 'wireless-mouse',
    description: 'Ergonomic mouse',
    price: 499.50, // Floating point should fail validator
    category: new mongoose.Types.ObjectId(),
  });
  const floatErr = floatProduct.validateSync();
  assert.ok(floatErr.errors.price);

  // Valid product with integer paise
  const validProduct = new Product({
    name: 'Wireless Mouse',
    slug: 'wireless-mouse',
    description: 'Ergonomic optical mouse',
    price: 49900, // ₹499.00
    category: new mongoose.Types.ObjectId(),
    stock: 25,
  });
  assert.equal(validProduct.validateSync(), undefined);
  assert.equal(validProduct.priceInRupees, '499.00'); // Virtual check
});

test('Cart Model: validates product references and integer quantities', async () => {
  const userId = new mongoose.Types.ObjectId();
  const prodId = new mongoose.Types.ObjectId();

  const cart = new Cart({
    user: userId,
    items: [
      { product: prodId, quantity: 3 },
    ],
  });

  assert.equal(cart.validateSync(), undefined);
  assert.equal(cart.totalItems, 3);
});

test('Order Model: validates snapshot items, integer totals in paise, and order number', async () => {
  const userId = new mongoose.Types.ObjectId();
  const prodId = new mongoose.Types.ObjectId();

  const order = new Order({
    user: userId,
    orderNumber: 'ORD-20261016-0001',
    items: [
      {
        product: prodId,
        name: 'Wireless Mouse',
        slug: 'wireless-mouse',
        price: 49900,
        quantity: 2,
        subtotal: 99800,
      },
    ],
    shippingDetails: {
      fullName: 'Alice Sharma',
      address: '123 MG Road',
      city: 'Bengaluru',
      pinCode: '560001',
      phone: '+91 9876543210',
    },
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    totals: {
      itemsTotal: 99800,
      shippingFee: 5000,
      tax: 17964,
      grandTotal: 122764, // ₹1,227.64
    },
  });

  assert.equal(order.validateSync(), undefined);
  assert.equal(order.grandTotalInRupees, '1227.64');
});
