import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import { generateToken } from '../src/utils/token.js';

test('Product & Category Catalog API Test Suite', async (t) => {
  await setupTestDb({ seedCatalog: true });
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let adminToken = '';
  let customerToken = '';
  let sampleCategory = null;
  let sampleProduct = null;
  let createdProductId = null;

  t.after(async () => {
    // Clean up created entities
    if (createdProductId) {
      await Product.findByIdAndDelete(createdProductId);
    }
    await User.deleteMany({
      email: { $in: [`cust_prod_${timestamp}@shopeasy.test`, `admin_prod_${timestamp}@shopeasy.test`] },
    });
    server.close();
    await teardownTestDb();
  });

  // Setup: Create test tokens
  await t.test('Setup: Create customer & admin authentication tokens', async () => {
    const customer = await User.create({
      name: 'Catalog Customer',
      email: `cust_prod_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    customerToken = generateToken(customer);

    const admin = await User.create({
      name: 'Catalog Admin',
      email: `admin_prod_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'admin',
    });
    adminToken = generateToken(admin);

    sampleCategory = await Category.findOne({ slug: 'electronics-gadgets' });
    assert.ok(sampleCategory, 'Electronics category should exist from seed');

    sampleProduct = await Product.findOne({ category: sampleCategory._id });
    assert.ok(sampleProduct, 'Sample product should exist from seed');
  });

  // Test 1: GET /api/categories
  await t.test('GET /api/categories returns active categories', async () => {
    const res = await fetch(`${baseUrl}/categories`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.categories));
    assert.ok(data.count >= 4);
  });

  // Test 2: GET /api/products pagination defaults to 8
  await t.test('GET /api/products returns paginated list with 8 items by default', async () => {
    const res = await fetch(`${baseUrl}/products`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.page, 1);
    assert.ok(data.count <= 8);
    assert.ok(data.total >= 16);
    assert.ok(data.pages >= 2);
    assert.ok(Array.isArray(data.products));
    assert.ok(data.products[0].category.name); // Verified populated category
  });

  // Test 3: Search using partial matching
  await t.test('GET /api/products?search=headphone returns matching products', async () => {
    const res = await fetch(`${baseUrl}/products?search=headphone`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.count >= 1);
    assert.ok(data.products[0].name.toLowerCase().includes('headphone'));
  });

  // Test 4: Category filtering by slug
  await t.test('GET /api/products?category=electronics-gadgets filters by category', async () => {
    const res = await fetch(`${baseUrl}/products?category=electronics-gadgets`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.count >= 1);
    data.products.forEach((p) => {
      assert.equal(p.category.slug, 'electronics-gadgets');
    });
  });

  // Test 5: Price sorting ascending
  await t.test('GET /api/products?sort=price_asc returns products in ascending order', async () => {
    const res = await fetch(`${baseUrl}/products?sort=price_asc&limit=8`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    for (let i = 0; i < data.products.length - 1; i++) {
      assert.ok(data.products[i].price <= data.products[i + 1].price);
    }
  });

  // Test 6: Price sorting descending
  await t.test('GET /api/products?sort=price_desc returns products in descending order', async () => {
    const res = await fetch(`${baseUrl}/products?sort=price_desc&limit=8`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    for (let i = 0; i < data.products.length - 1; i++) {
      assert.ok(data.products[i].price >= data.products[i + 1].price);
    }
  });

  // Test 7: GET /api/products/:id with valid ID
  await t.test('GET /api/products/:id returns single product with category', async () => {
    const res = await fetch(`${baseUrl}/products/${sampleProduct._id}`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.product._id, sampleProduct._id.toString());
    assert.ok(data.product.category.name);
  });

  // Test 8: GET /api/products/:id with invalid ID returns 404
  await t.test('GET /api/products/:id returns 404 for non-existent ID', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await fetch(`${baseUrl}/products/${fakeId}`);
    const data = await res.json();

    assert.equal(res.status, 404);
    assert.equal(data.success, false);
    assert.equal(data.message, 'Product not found.');
  });

  // Test 9: Admin-only protection on POST /api/products
  await t.test('POST /api/products rejects unauthenticated and customer requests', async () => {
    // No token -> 401
    const resNoAuth = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized Product' }),
    });
    assert.equal(resNoAuth.status, 401);

    // Customer token -> 403 Forbidden
    const resCustomer = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ name: 'Unauthorized Product' }),
    });
    assert.equal(resCustomer.status, 403);
  });

  // Test 10: Admin successfully creates, updates, and deletes a product
  await t.test('Admin can perform complete CRUD lifecycle on products', async () => {
    // 1. Create product
    const createRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: `Test Gaming Mouse ${timestamp}`,
        description: 'RGB gaming mouse with optical sensor',
        price: 199900, // ₹1,999.00
        category: sampleCategory._id.toString(),
        stock: 25,
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
      }),
    });

    const createData = await createRes.json();
    assert.equal(createRes.status, 201);
    assert.equal(createData.success, true);
    assert.equal(createData.product.stock, 25);
    createdProductId = createData.product._id;

    // 2. Update product
    const updateRes = await fetch(`${baseUrl}/products/${createdProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        stock: 50,
        price: 179900, // ₹1,799.00
      }),
    });

    const updateData = await updateRes.json();
    assert.equal(updateRes.status, 200);
    assert.equal(updateData.success, true);
    assert.equal(updateData.product.stock, 50);
    assert.equal(updateData.product.price, 179900);

    // 3. Delete product
    const deleteRes = await fetch(`${baseUrl}/products/${createdProductId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const deleteData = await deleteRes.json();
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteData.success, true);

    // Verify it is no longer found
    const verifyRes = await fetch(`${baseUrl}/products/${createdProductId}`);
    assert.equal(verifyRes.status, 404);
    createdProductId = null; // Cleaned up
  });

  // Test 11: Out-of-stock behavior and filtering
  await t.test('Out-of-stock product behavior and inStock filtering', async () => {
    // Create temporary out-of-stock product
    const oosProduct = await Product.create({
      name: `Out of Stock Product ${timestamp}`,
      slug: `oos-product-${timestamp}`,
      description: 'Currently out of stock item',
      price: 99900,
      category: sampleCategory._id,
      stock: 0,
      isActive: true,
    });

    // 1. Should be retrievable directly by ID with stock: 0
    const detailRes = await fetch(`${baseUrl}/products/${oosProduct._id}`);
    const detailData = await detailRes.json();
    assert.equal(detailRes.status, 200);
    assert.equal(detailData.product.stock, 0);

    // 2. When inStock=true query is supplied, out of stock product must be excluded
    const inStockRes = await fetch(`${baseUrl}/products?inStock=true&limit=50`);
    const inStockData = await inStockRes.json();
    assert.equal(inStockRes.status, 200);
    const foundOos = inStockData.products.some((p) => p._id === oosProduct._id.toString());
    assert.equal(foundOos, false, 'Out-of-stock product must be excluded when inStock=true');

    // Clean up
    await Product.findByIdAndDelete(oosProduct._id);
  });

  // Test 12: Comprehensive Multi-Field Search (name, description, brand, category, SKU, multi-word, case)
  await t.test('Comprehensive multi-field search matches name, description, brand, category, and SKU', async () => {
    // Create dedicated search test products
    const testProducts = await Product.insertMany([
      {
        name: 'Summer Silk Gown',
        slug: `summer-silk-gown-${timestamp}`,
        description: 'An elegant red dress with floral embroideries for evening parties.',
        brand: 'ZaraFashion',
        sku: `DRS-RED-${timestamp}`,
        price: 299900,
        category: sampleCategory._id, // electronics-gadgets for category test isolation
        stock: 10,
        isActive: true,
      },
      {
        name: 'Galaxy Ultra Smartphone',
        slug: `galaxy-ultra-smartphone-${timestamp}`,
        description: 'Flagship mobile phone with 200MP camera and stylus pen.',
        brand: 'Samsung',
        sku: `SAM-GAL-${timestamp}`,
        price: 8999900,
        category: sampleCategory._id,
        stock: 15,
        isActive: true,
      },
      {
        name: 'Pro Audio C++ [Special Edition] (Studio+)',
        slug: `pro-audio-cpp-${timestamp}`,
        description: 'Studio monitoring system for sound engineering.',
        brand: 'AudioTech',
        sku: `AUD-CPP-${timestamp}`,
        price: 1599900,
        category: sampleCategory._id,
        stock: 5,
        isActive: true,
      },
    ]);

    const createdIds = testProducts.map((p) => p._id);

    try {
      // 1. Search by keyword in description ("dress")
      const dressRes = await fetch(`${baseUrl}/products?search=dress`);
      const dressData = await dressRes.json();
      assert.equal(dressRes.status, 200);
      assert.ok(dressData.products.some((p) => p.name === 'Summer Silk Gown'), 'Should match "dress" in description');

      // 2. Search by brand ("samsung")
      const brandRes = await fetch(`${baseUrl}/products?search=samsung`);
      const brandData = await brandRes.json();
      assert.equal(brandRes.status, 200);
      assert.ok(brandData.products.some((p) => p.brand === 'Samsung'), 'Should match brand "Samsung"');

      // 3. Search by SKU
      const skuRes = await fetch(`${baseUrl}/products?search=${encodeURIComponent(`SAM-GAL-${timestamp}`)}`);
      const skuData = await skuRes.json();
      assert.equal(skuRes.status, 200);
      assert.ok(skuData.products.some((p) => p.sku === `SAM-GAL-${timestamp}`), 'Should match SKU');

      // 4. Search by Category Name ("electronics")
      const catRes = await fetch(`${baseUrl}/products?search=electronics&limit=50`);
      const catData = await catRes.json();
      assert.equal(catRes.status, 200);
      assert.ok(catData.count >= 4, 'Should return products belonging to Electronics & Gadgets');

      // 5. Multi-word search ("red dress")
      const multiRes = await fetch(`${baseUrl}/products?search=${encodeURIComponent('red dress')}`);
      const multiData = await multiRes.json();
      assert.equal(multiRes.status, 200);
      assert.ok(multiData.products.some((p) => p.name === 'Summer Silk Gown'), 'Should match multi-word "red dress"');

      // 6. Case insensitivity ("DRESS" vs "dress")
      const upperRes = await fetch(`${baseUrl}/products?search=DRESS`);
      const upperData = await upperRes.json();
      assert.equal(upperRes.status, 200);
      assert.ok(upperData.products.some((p) => p.name === 'Summer Silk Gown'), 'Should match uppercase "DRESS"');

      // 7. Regex special characters ("C++ [Special Edition] (Studio+)")
      const regexRes = await fetch(`${baseUrl}/products?search=${encodeURIComponent('C++ [Special Edition]')}`);
      const regexData = await regexRes.json();
      assert.equal(regexRes.status, 200);
      assert.ok(regexData.products.some((p) => p.name.includes('C++')), 'Should safely match string with regex chars');
    } finally {
      await Product.deleteMany({ _id: { $in: createdIds } });
    }
  });
});
