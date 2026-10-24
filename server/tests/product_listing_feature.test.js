import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { setupTestDb, teardownTestDb } from './testDb.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import { generateToken } from '../src/utils/token.js';

test('Product Listing Feature Comprehensive Test Suite', async (t) => {
  await setupTestDb({ seedCatalog: true });
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  let customerToken = '';

  t.after(async () => {
    await User.deleteMany({ email: `listing_cust_${timestamp}@shopeasy.test` });
    server.close();
    await teardownTestDb();
  });

  // Setup: Create test customer token
  await t.test('Setup: Create customer token for testing', async () => {
    const customer = await User.create({
      name: 'Listing Tester',
      email: `listing_cust_${timestamp}@shopeasy.test`,
      passwordHash: 'dummyhash',
      role: 'customer',
    });
    customerToken = generateToken(customer);
    assert.ok(customerToken);
  });

  // 1. Opening product listing displays products with default 12 limit
  await t.test('1. Product Listing: GET /api/products?limit=12 returns 12 products per page and page size metadata', async () => {
    const res = await fetch(`${baseUrl}/products?limit=12`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.page, 1);
    assert.equal(data.pageSize, 12);
    assert.equal(data.limit, 12);
    assert.ok(data.count <= 12);
    assert.ok(data.total >= 16);
    assert.ok(data.pages >= 2);
    assert.ok(Array.isArray(data.products));
    assert.ok(data.products[0].name);
    assert.ok(data.products[0].category.name);
    assert.ok(typeof data.products[0].price === 'number');
  });

  // 2. Case-insensitive search with partial matching
  await t.test('2. Product Search: Case-insensitive and partial match for "dress" vs "DRESS" vs "Dress"', async () => {
    // Insert a test dress product
    const fashionCat = await Category.findOne({ slug: 'fashion-apparel' });
    assert.ok(fashionCat);

    const testDress = await Product.create({
      name: 'Summer Floral Maxi Dress',
      slug: `summer-floral-maxi-dress-${timestamp}`,
      description: 'Elegant breezy summer dress made from sustainable viscose.',
      price: 249900,
      category: fashionCat._id,
      brand: 'Aura',
      stock: 15,
      imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c',
    });

    const resLower = await fetch(`${baseUrl}/products?search=dress`);
    const dataLower = await resLower.json();

    const resUpper = await fetch(`${baseUrl}/products?search=DRESS`);
    const dataUpper = await resUpper.json();

    const resMixed = await fetch(`${baseUrl}/products?search=Dress`);
    const dataMixed = await resMixed.json();

    assert.equal(resLower.status, 200);
    assert.equal(resUpper.status, 200);
    assert.equal(resMixed.status, 200);

    assert.equal(dataLower.total, dataUpper.total);
    assert.equal(dataLower.total, dataMixed.total);
    assert.ok(dataLower.total >= 1);

    const foundLower = dataLower.products.some((p) => p.name.includes('Dress'));
    assert.ok(foundLower, 'Expected product with Dress in name to be found');

    // Clean up
    await Product.findByIdAndDelete(testDress._id);
  });

  // 3. Search for nonexistent product returns empty state (count: 0)
  await t.test('3. Product Search: Nonexistent search term returns count: 0 and empty array', async () => {
    const res = await fetch(`${baseUrl}/products?search=completely_nonexistent_xyz_term_9999`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.count, 0);
    assert.equal(data.total, 0);
    assert.equal(data.products.length, 0);
  });

  // 4. Selecting category filters products correctly
  await t.test('4. Category Filter: Selecting category slug returns only products in that category', async () => {
    const res = await fetch(`${baseUrl}/products?category=electronics-gadgets&limit=50`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.count >= 1);
    data.products.forEach((p) => {
      assert.equal(p.category.slug, 'electronics-gadgets');
    });
  });

  // 5. Search and category filter work together
  await t.test('5. Search and Category Filter: Combined query filters by both criteria', async () => {
    // Search "headphone" in electronics-gadgets
    const resMatch = await fetch(`${baseUrl}/products?search=headphone&category=electronics-gadgets`);
    const dataMatch = await resMatch.json();

    assert.equal(resMatch.status, 200);
    assert.ok(dataMatch.total >= 1);
    dataMatch.products.forEach((p) => {
      assert.equal(p.category.slug, 'electronics-gadgets');
    });

    // Search "headphone" in books-stationery (should return 0)
    const resNoMatch = await fetch(`${baseUrl}/products?search=headphone&category=books-stationery`);
    const dataNoMatch = await resNoMatch.json();

    assert.equal(resNoMatch.status, 200);
    assert.equal(dataNoMatch.count, 0);
    assert.equal(dataNoMatch.total, 0);
  });

  // 6. Pagination does not duplicate products across pages
  await t.test('6. Pagination: Page 1 and Page 2 products are mutually exclusive (no duplicate IDs)', async () => {
    const resPage1 = await fetch(`${baseUrl}/products?page=1&limit=6`);
    const dataPage1 = await resPage1.json();

    const resPage2 = await fetch(`${baseUrl}/products?page=2&limit=6`);
    const dataPage2 = await resPage2.json();

    assert.equal(resPage1.status, 200);
    assert.equal(resPage2.status, 200);
    assert.equal(dataPage1.products.length, 6);
    assert.equal(dataPage2.products.length, 6);

    const idsPage1 = new Set(dataPage1.products.map((p) => p._id));
    const duplicateIds = dataPage2.products.filter((p) => idsPage1.has(p._id));

    assert.equal(duplicateIds.length, 0, 'Products should not be duplicated across pages');
  });

  // 7. Page and limit bounding & validation
  await t.test('7. Backend Validation: Negative or invalid page and limit values are safely bounded', async () => {
    const res = await fetch(`${baseUrl}/products?page=-5&limit=9999`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.page, 1); // Safely bounded to 1
    assert.equal(data.pageSize, 50); // Safely bounded to max 50
    assert.equal(data.limit, 50);
  });

  // 8. Add to cart works with product from listing
  await t.test('8. Cart Integration: Product from listing can be added to cart', async () => {
    const prodRes = await fetch(`${baseUrl}/products?limit=1`);
    const prodData = await prodRes.json();
    const targetProduct = prodData.products[0];

    assert.ok(targetProduct);

    const addCartRes = await fetch(`${baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ productId: targetProduct._id, quantity: 1 }),
    });

    const addCartData = await addCartRes.json();
    assert.equal(addCartRes.status, 200);
    assert.equal(addCartData.success, true);
    assert.ok(addCartData.cart.items.length >= 1);
  });
});
