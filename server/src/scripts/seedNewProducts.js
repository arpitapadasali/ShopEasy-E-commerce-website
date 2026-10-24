import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { slugify } from '../utils/helpers.js';
import { userSubmittedProducts } from '../data/userSubmittedProducts.js';

/**
 * Seeds and upserts user-submitted catalog products and their corresponding categories.
 */
export async function seedNewProducts() {
  console.log('====================================================');
  console.log(` ShopEasy Catalog Ingestion - ${userSubmittedProducts.length} User Products`);
  console.log('====================================================');

  await connectDatabase();

  try {
    // 1. Ensure all categories exist
    const categoryMap = new Map();
    let categoriesCreated = 0;

    for (const prod of userSubmittedProducts) {
      const catName = prod.category;
      const catSlug = slugify(catName);

      if (!categoryMap.has(catSlug)) {
        let existingCat = await Category.findOne({
          $or: [{ slug: catSlug }, { name: new RegExp(`^${catName}$`, 'i') }],
        });

        if (!existingCat) {
          existingCat = await Category.create({
            name: catName,
            slug: catSlug,
            description: `${catName} products and gear.`,
            imageUrl: prod.imageUrl || '',
            isActive: true,
          });
          categoriesCreated++;
          console.log(`  [Category Created]: "${catName}" (${catSlug})`);
        }

        categoryMap.set(catSlug, existingCat);
      }
    }

    console.log(` Total Categories Processed: ${categoryMap.size} (New Created: ${categoriesCreated})`);

    // 2. Upsert products
    let insertedCount = 0;
    let updatedCount = 0;

    for (const prod of userSubmittedProducts) {
      const catSlug = slugify(prod.category);
      const categoryDoc = categoryMap.get(catSlug);

      if (!categoryDoc) {
        console.warn(`  [Warning]: Category not found for product "${prod.name}"`);
        continue;
      }

      const baseSlug = slugify(prod.name);
      // Ensure unique slug if collision occurs with a different SKU
      let productSlug = baseSlug;
      const slugOwner = await Product.findOne({ slug: productSlug });
      if (slugOwner && slugOwner.sku !== prod.sku) {
        productSlug = `${baseSlug}-${prod.sku.toLowerCase()}`;
      }

      const updateData = {
        name: prod.name,
        slug: productSlug,
        sku: prod.sku,
        description: prod.description,
        price: prod.price, // in paise
        category: categoryDoc._id,
        brand: prod.brand,
        stock: prod.stock,
        discount: prod.discount,
        imageUrl: prod.imageUrl,
        isActive: true,
      };

      const existingProd = await Product.findOne({
        $or: [{ sku: prod.sku }, { slug: productSlug }],
      });

      if (existingProd) {
        await Product.findByIdAndUpdate(existingProd._id, { $set: updateData });
        updatedCount++;
        console.log(`  ✔ Updated: [${prod.sku}] "${prod.name.slice(0, 40)}..." (₹${(prod.price / 100).toFixed(2)})`);
      } else {
        await Product.create({
          ...updateData,
          featured: false,
        });
        insertedCount++;
        console.log(`  ✔ Inserted: [${prod.sku}] "${prod.name.slice(0, 40)}..." (₹${(prod.price / 100).toFixed(2)})`);
      }
    }

    console.log('====================================================');
    console.log(' Ingestion Summary:');
    console.log(`   New Products Inserted: ${insertedCount}`);
    console.log(`   Products Updated:      ${updatedCount}`);
    console.log(`   Total User Products:   ${userSubmittedProducts.length}`);
    console.log('====================================================');
  } catch (error) {
    console.error('[Ingestion Error]:', error);
    process.exitCode = 1;
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('seedNewProducts.js')) {
  seedNewProducts().catch(() => process.exit(1));
}
