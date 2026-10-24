import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import { categoriesData, rawProductsData } from '../src/scripts/seedDatabase.js';

let mongod = null;

/**
 * Seed the standard catalog (4 categories and 16 products) into the test database.
 */
export const seedTestCatalog = async () => {
  const existingCount = await Category.countDocuments();
  if (existingCount > 0) return;

  const createdCategories = await Category.insertMany(categoriesData);
  const catMap = new Map(createdCategories.map((c) => [c.slug, c._id]));

  const products = rawProductsData.map((p) => ({
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    category: catMap.get(p.categorySlug),
    stock: p.stock,
    imageUrl: p.imageUrl,
    featured: p.featured,
    isActive: p.isActive,
  }));

  await Product.insertMany(products);
};

/**
 * Sets up an isolated test database.
 * If USE_ATLAS=true, connects to configured Atlas URI.
 * Otherwise, launches a pristine in-memory MongoDB instance to ensure
 * tests are 100% non-destructive and independent of cloud network access.
 */
export const setupTestDb = async ({ seedCatalog = false } = {}) => {
  if (process.env.USE_ATLAS === 'true') {
    await connectDatabase();
    if (seedCatalog) await seedTestCatalog();
    return null;
  }

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await connectDatabase(uri);
  if (seedCatalog) {
    await seedTestCatalog();
  }
  return mongod;
};

/**
 * Tears down the test database cleanly.
 */
export const teardownTestDb = async () => {
  await disconnectDatabase();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
};

export default { setupTestDb, teardownTestDb, seedTestCatalog };
