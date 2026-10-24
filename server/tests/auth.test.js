import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import { generateToken } from '../src/utils/token.js';

test('Authentication & Authorization Test Suite', async (t) => {
  // 1. Establish database connection
  await setupTestDb();
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/auth`;

  const timestamp = Date.now();
  const testCustomerEmail = `customer_${timestamp}@shopeasy.test`;
  const testCustomerPassword = 'Password123!';
  let customerToken = '';
  let customerId = '';

  const testAdminEmail = `admin_${timestamp}@shopeasy.test`;
  const testAdminPassword = 'AdminPassword123!';
  let adminToken = '';

  t.after(async () => {
    // Cleanup created test users
    await User.deleteMany({
      email: { $in: [testCustomerEmail, testAdminEmail, `dup_${timestamp}@shopeasy.test`] },
    });
    server.close();
    await teardownTestDb();
  });

  // Test 1: Register customer successfully
  await t.test('POST /api/auth/register creates customer and returns token', async () => {
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        email: testCustomerEmail,
        password: testCustomerPassword,
        passwordConfirm: testCustomerPassword,
        phone: '+91 9876543210',
        role: 'admin', // Malicious attempt to self-assign admin role
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.email, testCustomerEmail);
    assert.equal(data.user.role, 'customer'); // Role override security verified!
    assert.equal(data.user.passwordHash, undefined); // Password hash excluded!

    customerToken = data.token;
    customerId = data.user._id;
  });

  // Test 2: Reject duplicate registration
  await t.test('POST /api/auth/register rejects duplicate email with 409', async () => {
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Customer',
        email: testCustomerEmail,
        password: testCustomerPassword,
        passwordConfirm: testCustomerPassword,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 409);
    assert.equal(data.success, false);
    assert.ok(data.message.includes('already exists'));
  });

  // Test 3: Validate password minimum length
  await t.test('POST /api/auth/register rejects password shorter than 6 characters', async () => {
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Short Password User',
        email: `short_${timestamp}@shopeasy.test`,
        password: '123',
        passwordConfirm: '123',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.ok(data.message.includes('6 characters'));
  });

  // Test 4: Validate password confirmation mismatch
  await t.test('POST /api/auth/register rejects password confirmation mismatch', async () => {
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Mismatch User',
        email: `mismatch_${timestamp}@shopeasy.test`,
        password: 'Password123!',
        passwordConfirm: 'DifferentPassword123!',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.ok(data.message.includes('does not match'));
  });

  // Test 5: Login with valid credentials
  await t.test('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testCustomerPassword,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.email, testCustomerEmail);
    assert.equal(data.user.passwordHash, undefined);
  });

  // Test 6: Login with invalid password
  await t.test('POST /api/auth/login fails with invalid credentials (401)', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: 'WrongPassword!',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
    assert.equal(data.message, 'Invalid email or password.');
  });

  // Test 7: GET /api/auth/me without token returns 401
  await t.test('GET /api/auth/me returns 401 without Bearer token', async () => {
    const res = await fetch(`${baseUrl}/me`);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  // Test 8: GET /api/auth/me with invalid token returns 401
  await t.test('GET /api/auth/me returns 401 with invalid token', async () => {
    const res = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: 'Bearer invalid.token.value' },
    });
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  // Test 9: GET /api/auth/me with valid token returns user profile
  await t.test('GET /api/auth/me returns user profile with valid token', async () => {
    const res = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.email, testCustomerEmail);
    assert.equal(data.user.role, 'customer');
  });

  // Test 10: Customer cannot access admin-only endpoint (403 Forbidden)
  await t.test('GET /api/auth/admin-only returns 403 Forbidden for customer role', async () => {
    const res = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.ok(data.message.includes('Administrator privileges required'));
  });

  // Test 11: Admin can access admin-only endpoint
  await t.test('GET /api/auth/admin-only returns 200 OK for admin role', async () => {
    // Create test admin directly
    const newAdmin = await User.create({
      name: 'System Admin',
      email: testAdminEmail,
      passwordHash: 'dummyhash',
      role: 'admin',
    });
    adminToken = generateToken(newAdmin);

    const res = await fetch(`${baseUrl}/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.message.includes('Authorized'));
  });

  // Test 12: PUT /api/auth/profile updates profile and rejects role modification
  await t.test('PUT /api/auth/profile updates profile fields and rejects role elevation', async () => {
    const res = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Customer Name',
        city: 'Mumbai',
        role: 'admin', // Attempted privilege escalation
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.name, 'Updated Customer Name');
    assert.equal(data.user.city, 'Mumbai');
    assert.equal(data.user.role, 'customer'); // Unchanged!
  });

  // Test 13: POST /api/auth/logout succeeds
  await t.test('POST /api/auth/logout succeeds', async () => {
    const res = await fetch(`${baseUrl}/logout`, { method: 'POST' });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
  });
});
