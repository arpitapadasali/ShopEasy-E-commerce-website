import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Product from '../models/Product.js';

/**
 * Migration Script: Safely assign unique SKUs to any existing products without a SKU
 * and verify the sparse unique index on MongoDB Atlas.
 *
 * Idempotent: Can be run multiple times safely without altering existing SKUs or other fields.
 */
async function migrateProductSkus() {
  console.log('====================================================');
  console.log(' ShopEasy Product SKU Schema Migration');
  console.log('====================================================');

  try {
    await connectDatabase();

    // 1. Find all products missing SKU, or with null / empty SKU
    const unmigratedProducts = await Product.find({
      $or: [{ sku: { $exists: false } }, { sku: null }, { sku: '' }],
    }).populate('category', 'slug name');

    console.log(`[Migration] Found ${unmigratedProducts.length} product(s) requiring SKU assignment.`);

    let migratedCount = 0;
    const existingSkus = new Set(
      (await Product.find({ sku: { $exists: true, $ne: null } }, 'sku').lean())
        .map((p) => p.sku)
        .filter(Boolean)
    );

    for (const product of unmigratedProducts) {
      const catSlug = product.category?.slug || 'GEN';
      const catPrefix = catSlug
        .split('-')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4) || 'PRD';

      const baseSlugPart = (product.slug || 'item')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6);

      let candidateSku = `SE-${catPrefix}-${baseSlugPart}`;
      let suffix = 1;

      while (existingSkus.has(candidateSku)) {
        candidateSku = `SE-${catPrefix}-${baseSlugPart}-${suffix}`;
        suffix++;
      }

      existingSkus.add(candidateSku);
      product.sku = candidateSku;
      await product.save();
      migratedCount++;
      console.log(`  ✔ Assigned SKU "${candidateSku}" -> "${product.name}"`);
    }

    // 2. Sync and ensure indexes
    console.log('[Migration] Verifying MongoDB Atlas indexes...');
    await Product.syncIndexes();
    console.log('[Migration] Product indexes synchronized successfully.');

    console.log('====================================================');
    console.log(` Migration Complete: ${migratedCount} product(s) updated.`);
    console.log('====================================================');
  } catch (error) {
    console.error('[Migration Error]:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

migrateProductSkus();
