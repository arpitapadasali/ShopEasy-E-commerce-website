import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import { generateToken } from '../src/utils/token.js';

test('Bulk CSV Import, SKU Deduplication & Price Filtering Test Suite', async (t) => {
  await setupTestDb({ seedCatalog: true });
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let adminToken = '';
  let customerToken = '';

  t.after(async () => {
    await User.deleteMany({
      email: { $in: [`bulk_cust_${timestamp}@shopeasy.test`, `bulk_admin_${timestamp}@shopeasy.test`] },
    });
    server.close();
    await teardownTestDb();
  });

  // Setup tokens
  await t.test('Setup: Create customer and admin authentication tokens', async () => {
    const customer = await User.create({
      name: 'Bulk Customer',
      email: `bulk_cust_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    customerToken = generateToken(customer);

    const admin = await User.create({
      name: 'Bulk Admin',
      email: `bulk_admin_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'admin',
    });
    adminToken = generateToken(admin);
  });

  // Test 1: Download Sample CSV template
  await t.test('GET /api/products/sample-csv requires admin and returns valid CSV template', async () => {
    // Unauthenticated
    const resNoAuth = await fetch(`${baseUrl}/products/sample-csv`);
    assert.equal(resNoAuth.status, 401);

    // Customer
    const resCust = await fetch(`${baseUrl}/products/sample-csv`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(resCust.status, 403);

    // Admin
    const resAdmin = await fetch(`${baseUrl}/products/sample-csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resAdmin.status, 200);
    const contentType = resAdmin.headers.get('content-type');
    assert.ok(contentType?.includes('text/csv'));
    const csvContent = await resAdmin.text();
    assert.ok(csvContent.includes('name,description,price,category,brand,imageUrl,stock,discount,featured,sku'));
    assert.ok(csvContent.includes('SE-HOM-010'));
  });

  // Test 2: Bulk Import authorization
  await t.test('POST /api/products/import-csv protects against non-admin requests', async () => {
    const resNoAuth = await fetch(`${baseUrl}/products/import-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData: 'dummy' }),
    });
    assert.equal(resNoAuth.status, 401);

    const resCust = await fetch(`${baseUrl}/products/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ csvData: 'dummy' }),
    });
    assert.equal(resCust.status, 403);
  });

  // Test 3: Successful CSV Bulk Import with row validations and auto-category creation
  await t.test('POST /api/products/import-csv successfully imports valid products and auto-creates missing category', async () => {
    const csvPayload = `name,description,price,category,brand,imageUrl,stock,discount,featured,sku
"UltraTest Headphones ${timestamp}","High-fidelity headphones with deep bass",4999.00,"Electronics & Gadgets","SonicPulse","https://example.com/img1.jpg",30,10,true,"SE-TEST-001-${timestamp}"
"Organic Yoga Mat ${timestamp}","Eco-friendly cork and rubber exercise mat",2199.00,"Fitness & Wellness","ZenFlow","https://example.com/img2.jpg",20,0,false,"SE-TEST-002-${timestamp}"`;

    const res = await fetch(`${baseUrl}/products/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ csvData: csvPayload }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.summary.importedCount, 2);
    assert.equal(data.summary.failedCount, 0);

    // Verify product exists in database and category was created
    const createdProduct = await Product.findOne({ sku: `SE-TEST-001-${timestamp}` }).populate('category');
    assert.ok(createdProduct);
    assert.equal(createdProduct.price, 499900); // Converted to paise
    assert.equal(createdProduct.brand, 'SonicPulse');
    assert.equal(createdProduct.discount, 10);

    // Verify auto-created category "Fitness & Wellness"
    const autoCreatedCategory = await Category.findOne({ slug: 'fitness-wellness' });
    assert.ok(autoCreatedCategory, 'New category should be auto-created during bulk import');
  });

  // Test 4: Rejection of duplicate SKU and duplicate product names
  await t.test('POST /api/products/import-csv prevents duplicate products by SKU and name', async () => {
    const duplicateCsv = `name,description,price,category,brand,imageUrl,stock,discount,featured,sku
"UltraTest Headphones ${timestamp}","Same product name duplicate",4999.00,"Electronics & Gadgets","SonicPulse","",10,0,false,"SE-NEW-SKU-${timestamp}"
"Different Title ${timestamp}","Different title but duplicate SKU",3999.00,"Electronics & Gadgets","SonicPulse","",10,0,false,"SE-TEST-001-${timestamp}"
"Valid New Product ${timestamp}","A completely valid new product row",1599.00,"Electronics & Gadgets","SonicPulse","",25,5,false,"SE-TEST-003-${timestamp}"`;

    const res = await fetch(`${baseUrl}/products/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ csvData: duplicateCsv }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.summary.importedCount, 1);
    assert.equal(data.summary.failedCount, 2);
    assert.ok(data.summary.errors.length >= 2);
    assert.ok(data.summary.errors.some((e) => e.reason.includes('Duplicate product with name')));
    assert.ok(data.summary.errors.some((e) => e.reason.includes('Duplicate SKU')));
  });

  // Test 5: Rejection of invalid rows (missing fields, invalid prices)
  await t.test('POST /api/products/import-csv catches invalid rows and reports detailed reasons', async () => {
    const invalidCsv = `name,description,price,category,brand,imageUrl,stock,discount,featured,sku
"","Missing name",2999.00,"Electronics & Gadgets","Brand","",10,0,false,""
"Invalid Price Product","Description with bad price",NotANumber,"Electronics & Gadgets","Brand","",10,0,false,""
"Negative Stock Product","Description with negative stock",999.00,"Electronics & Gadgets","Brand","",-5,0,false,""`;

    const res = await fetch(`${baseUrl}/products/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ csvData: invalidCsv }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.summary.importedCount, 0);
    assert.equal(data.summary.failedCount, 3);
    assert.ok(data.summary.errors.some((e) => e.reason.includes('Product name is required')));
    assert.ok(data.summary.errors.some((e) => e.reason.includes('Invalid price')));
  });

  // Test 6: Server-side Price Range Filtering on GET /api/products
  await t.test('GET /api/products filters accurately by minPrice and maxPrice in INR', async () => {
    // Range: minPrice=2000 (200000 paise) and maxPrice=5000 (500000 paise)
    const res = await fetch(`${baseUrl}/products?minPrice=2000&maxPrice=5000&limit=50`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.products.length > 0);
    for (const p of data.products) {
      assert.ok(p.price >= 200000, `Product price ${p.price} should be >= 200000 paise`);
      assert.ok(p.price <= 500000, `Product price ${p.price} should be <= 500000 paise`);
    }
  });

  // Test 7: Verify imported products are accessible to customer-facing catalog
  await t.test('Imported products appear in public customer catalog GET /api/products', async () => {
    const res = await fetch(`${baseUrl}/products?search=UltraTest`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.products.length >= 1);
    assert.equal(data.products[0].sku, `SE-TEST-001-${timestamp}`);
    assert.equal(data.products[0].brand, 'SonicPulse');
  });
});
