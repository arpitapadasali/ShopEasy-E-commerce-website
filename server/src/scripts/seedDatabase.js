import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { config } from '../config/env.js';
import { Category, Product, User, Coupon } from '../models/index.js';
import { slugify } from '../utils/helpers.js';
import { userSubmittedProducts } from '../data/userSubmittedProducts.js';

/**
 * Initial Categories Dataset (At least 3 categories)
 */
const categoriesData = [
  {
    name: 'Electronics & Gadgets',
    slug: 'electronics-gadgets',
    description: 'Smartphones, headphones, laptops, and premium consumer electronics.',
    imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    name: 'Fashion & Apparel',
    slug: 'fashion-apparel',
    description: 'Contemporary menswear, womenswear, activewear, and lifestyle accessories.',
    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Modern cookware, home appliances, interior decor, and living essentials.',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    name: 'Books & Stationery',
    slug: 'books-stationery',
    description: 'Bestselling novels, educational resources, premium notebooks, and desk organizers.',
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
];

/**
 * Initial Products Dataset (16 products, >= 15 requested)
 * All prices specified in integer PAISE (1 INR = 100 Paise)
 * Example: ₹1,499.00 -> 149900 paise
 */
const rawProductsData = [
  // --- Electronics & Gadgets ---
  {
    name: 'AcousticPro Wireless Noise-Cancelling Headphones',
    slug: 'acousticpro-wireless-headphones',
    description: 'Over-ear active noise cancelling Bluetooth 5.3 headphones with 40-hour battery life.',
    price: 499900, // ₹4,999.00
    categorySlug: 'electronics-gadgets',
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    featured: true,
    isActive: true,
  },
  {
    name: 'UltraGlow 4K Ultra-HD Smart Monitor 27-inch',
    slug: 'ultraglow-4k-smart-monitor',
    description: 'IPS display with HDR400, 144Hz refresh rate, and USB-C 65W charging delivery.',
    price: 2499900, // ₹24,999.00
    categorySlug: 'electronics-gadgets',
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
    featured: true,
    isActive: true,
  },
  {
    name: 'PulseTrack Fitness & Health Smartwatch',
    slug: 'pulsetrack-fitness-smartwatch',
    description: 'Water-resistant smartwatch featuring SpO2 sensor, continuous heart rate, and GPS.',
    price: 299900, // ₹2,999.00
    categorySlug: 'electronics-gadgets',
    stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },
  {
    name: 'HyperDrive 65W GaN Fast Charger',
    slug: 'hyperdrive-65w-gan-charger',
    description: 'Compact 3-port Gallium Nitride wall charger with Power Delivery 3.0.',
    price: 149900, // ₹1,499.00
    categorySlug: 'electronics-gadgets',
    stock: 120,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },

  // --- Fashion & Apparel ---
  {
    name: 'Heritage Classic Organic Cotton Crewneck T-Shirt',
    slug: 'heritage-classic-cotton-tshirt',
    description: '100% GOTS certified organic combed cotton tee with reinforced collar.',
    price: 79900, // ₹799.00
    categorySlug: 'fashion-apparel',
    stock: 150,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    featured: true,
    isActive: true,
  },
  {
    name: 'UrbanFlex Slim Fit Stretch Chino Trousers',
    slug: 'urbanflex-slim-fit-chinos',
    description: 'Breathable cotton-elastane blend designed for all-day commuting comfort.',
    price: 189900, // ₹1,899.00
    categorySlug: 'fashion-apparel',
    stock: 75,
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },
  {
    name: 'All-Weather Waterproof Commuter Backpack 22L',
    slug: 'all-weather-commuter-backpack',
    description: 'Durable ballistic nylon pack with padded 16-inch laptop compartment and YKK zippers.',
    price: 329900, // ₹3,299.00
    categorySlug: 'fashion-apparel',
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
    featured: true,
    isActive: true,
  },
  {
    name: 'Classic Polarized Aviator Sunglasses',
    slug: 'classic-polarized-aviator-sunglasses',
    description: 'UV400 protective polarized lenses set in a lightweight corrosion-resistant frame.',
    price: 129900, // ₹1,299.00
    categorySlug: 'fashion-apparel',
    stock: 80,
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },

  // --- Home & Kitchen ---
  {
    name: 'BaristaTouch Precision Pour-Over Kettle',
    slug: 'baristatouch-pour-over-kettle',
    description: 'Stainless steel gooseneck kettle with integrated thermometer for specialty coffee brews.',
    price: 219900, // ₹2,199.00
    categorySlug: 'home-kitchen',
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80',
    featured: true,
    isActive: true,
  },
  {
    name: 'AromaPure Ultrasonic Essential Oil Diffuser',
    slug: 'aromapure-ultrasonic-diffuser',
    description: '500ml ultrasonic cool mist diffuser with 7 ambient LED lighting modes and auto-shutoff.',
    price: 159900, // ₹1,599.00
    categorySlug: 'home-kitchen',
    stock: 55,
    imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },
  {
    name: 'ChefMaster 3-Ply Tri-Ply Stainless Steel Skillet 26cm',
    slug: 'chefmaster-tri-ply-stainless-skillet',
    description: 'Even heat distribution skillet compatible with induction, gas, and oven up to 260°C.',
    price: 289900, // ₹2,899.00
    categorySlug: 'home-kitchen',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1584990347449-39906665793e?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },
  {
    name: 'BreezeAir Desktop HEPA Air Purifier',
    slug: 'breezeair-desktop-hepa-purifier',
    description: 'H13 true HEPA filtration capturing 99.97% of airborne particles, dust, and allergens.',
    price: 449900, // ₹4,499.00
    categorySlug: 'home-kitchen',
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },

  // --- Books & Stationery ---
  {
    name: 'Artisan Hardcover Dotted Journal A5',
    slug: 'artisan-hardcover-dotted-journal',
    description: '160gsm bleed-proof bamboo paper notebook featuring ribbon bookmark and expandable pocket.',
    price: 64900, // ₹649.00
    categorySlug: 'books-stationery',
    stock: 140,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },
  {
    name: 'Minimalist Aluminum Fountain Pen (Medium Nib)',
    slug: 'minimalist-aluminum-fountain-pen',
    description: 'Precision-machined aircraft-grade aluminum barrel with German stainless steel nib.',
    price: 119900, // ₹1,199.00
    categorySlug: 'books-stationery',
    stock: 65,
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },
  {
    name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    slug: 'clean-code-handbook',
    description: 'Essential software engineering guide on writing readable, robust, and maintainable code.',
    price: 89900, // ₹899.00
    categorySlug: 'books-stationery',
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=600&auto=format&fit=crop&q=80',
    featured: true,
    isActive: true,
  },
  {
    name: 'Ergonomic Natural Bamboo Book & Tablet Stand',
    slug: 'ergonomic-bamboo-book-stand',
    description: 'Adjustable 6-angle reading rest with sturdy page holder clips for books and tablets.',
    price: 99900, // ₹999.00
    categorySlug: 'books-stationery',
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80',
    featured: false,
    isActive: true,
  },
];

/**
 * Development-only safe administrator seeding
 * Checks if an administrator already exists; NEVER overwrites an existing admin
 */
const seedDevelopmentAdmin = async () => {
  if (!config.createDevAdmin) {
    console.log('[Seed] CREATE_DEV_ADMIN is disabled. Skipping admin account creation.');
    return;
  }

  const adminEmail = config.devAdminEmail.toLowerCase().trim();

  // Check if an admin already exists with this email or with the admin role
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    console.log(`[Seed] Notice: Admin user already exists with email '${adminEmail}'.`);
    console.log('[Seed] Security Policy: Existing administrator credentials are NEVER overwritten.');
    return;
  }

  // Create fresh administrator
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(config.devAdminPassword, salt);

  const newAdmin = await User.create({
    name: 'ShopEasy System Administrator',
    email: adminEmail,
    passwordHash,
    role: 'admin',
    phone: '+91 9876543210',
    address: 'ShopEasy HQ, Tech Park',
    city: 'Bengaluru',
    pinCode: '560001',
  });

  console.log(`[Seed] Successfully created development administrator: ${newAdmin.email} (Role: ${newAdmin.role})`);
};

/**
 * Development-only demo customer account seeding
 */
const seedDevelopmentCustomer = async () => {
  const customerEmail = 'customer@shopeasy.local';
  const existingCustomer = await User.findOne({ email: customerEmail });
  if (existingCustomer) return;

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('CustomerPass123!', salt);

  await User.create({
    name: 'Demo Customer',
    email: customerEmail,
    passwordHash,
    role: 'customer',
    phone: '+91 9123456789',
    address: '123 Market Street',
    city: 'Mumbai',
    pinCode: '400001',
  });
  console.log(`[Seed] Successfully created demo customer: ${customerEmail}`);
};

/**
 * Seeds catalog, admin, and demo customer on an already-connected database.
 * Does NOT disconnect after completion so the active server connection remains alive.
 */
export const seedCatalogAndUsers = async (silent = false) => {
  const log = silent ? () => {} : console.log;

  log(`[Seed] Processing ${categoriesData.length} categories...`);
  const categoryMap = new Map();

  for (const cat of categoriesData) {
    const categoryDoc = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryMap.set(cat.slug, categoryDoc._id);
    log(`  ✓ Category: ${categoryDoc.name} [slug: ${categoryDoc.slug}]`);
  }

  log(`\n[Seed] Processing ${rawProductsData.length} sample products...`);
  for (const prod of rawProductsData) {
    const categoryId = categoryMap.get(prod.categorySlug);
    if (!categoryId) {
      log(`  ⚠ Warning: Category '${prod.categorySlug}' not found for product '${prod.name}'. Skipping.`);
      continue;
    }

    const productPayload = {
      name: prod.name,
      slug: prod.slug,
      description: prod.description,
      price: prod.price,
      category: categoryId,
      stock: prod.stock,
      imageUrl: prod.imageUrl,
      featured: prod.featured,
      isActive: prod.isActive,
    };

    const productDoc = await Product.findOneAndUpdate(
      { slug: prod.slug },
      { $set: productPayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const priceInRupees = (productDoc.price / 100).toFixed(2);
    log(`  ✓ Product: ${productDoc.name} (₹${priceInRupees} / ${productDoc.price} paise)`);
  }

  log(`\n[Seed] Processing ${userSubmittedProducts.length} extended catalog products...`);
  for (const prod of userSubmittedProducts) {
    const catSlug = slugify(prod.category);
    let categoryId = categoryMap.get(catSlug);
    if (!categoryId) {
      let existingCat = await Category.findOne({
        $or: [{ slug: catSlug }, { name: new RegExp(`^${prod.category}$`, 'i') }],
      });
      if (!existingCat) {
        existingCat = await Category.create({
          name: prod.category,
          slug: catSlug,
          description: `${prod.category} products and gear.`,
          imageUrl: prod.imageUrl || '',
          isActive: true,
        });
        log(`  ✓ Category Created: ${existingCat.name} [slug: ${existingCat.slug}]`);
      }
      categoryId = existingCat._id;
      categoryMap.set(catSlug, categoryId);
    }

    const baseSlug = slugify(prod.name);
    let productSlug = baseSlug;
    const slugOwner = await Product.findOne({ slug: productSlug });
    if (slugOwner && slugOwner.sku !== prod.sku) {
      productSlug = `${baseSlug}-${prod.sku.toLowerCase()}`;
    }

    const productPayload = {
      name: prod.name,
      slug: productSlug,
      sku: prod.sku,
      description: prod.description,
      price: prod.price,
      category: categoryId,
      brand: prod.brand,
      stock: prod.stock,
      discount: prod.discount,
      imageUrl: prod.imageUrl,
      featured: false,
      isActive: true,
    };

    const productDoc = await Product.findOneAndUpdate(
      { $or: [{ sku: prod.sku }, { slug: productSlug }] },
      { $set: productPayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const priceInRupees = (productDoc.price / 100).toFixed(2);
    log(`  ✓ Product: [${productDoc.sku}] ${productDoc.name.slice(0, 40)}... (₹${priceInRupees})`);
  }

  log('\n[Seed] Checking development users...');
  await seedDevelopmentAdmin();
  await seedDevelopmentCustomer();

  log('\n[Seed] Seeding promotional coupons...');
  const sampleCoupons = [
    {
      code: 'WELCOME10',
      description: '10% off up to ₹500 on all orders above ₹500',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 50000,
      maxDiscountAmount: 50000,
      startDate: new Date('2024-01-01'),
      expiryDate: new Date('2030-12-31'),
      isActive: true,
      usageLimit: 1000,
      userUsageLimit: 5,
      firstOrderOnly: false,
    },
    {
      code: 'FLAT200',
      description: 'Flat ₹200 off on minimum purchase of ₹1,000',
      discountType: 'fixed',
      discountValue: 20000,
      minOrderAmount: 100000,
      maxDiscountAmount: null,
      startDate: new Date('2024-01-01'),
      expiryDate: new Date('2030-12-31'),
      isActive: true,
      usageLimit: 500,
      userUsageLimit: 3,
      firstOrderOnly: false,
    },
    {
      code: 'FIRST50',
      description: '50% off on your very first order up to ₹1,000',
      discountType: 'percentage',
      discountValue: 50,
      minOrderAmount: 50000,
      maxDiscountAmount: 100000,
      startDate: new Date('2024-01-01'),
      expiryDate: new Date('2030-12-31'),
      isActive: true,
      usageLimit: 200,
      userUsageLimit: 1,
      firstOrderOnly: true,
    },
    {
      code: 'EXPIRED25',
      description: 'Expired test promotional coupon',
      discountType: 'percentage',
      discountValue: 25,
      minOrderAmount: 0,
      maxDiscountAmount: null,
      startDate: new Date('2023-01-01'),
      expiryDate: new Date('2023-12-31'),
      isActive: true,
      usageLimit: 100,
      userUsageLimit: 1,
      firstOrderOnly: false,
    },
    {
      code: 'INACTIVE10',
      description: 'Disabled promotional coupon',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 0,
      maxDiscountAmount: null,
      startDate: new Date('2024-01-01'),
      expiryDate: new Date('2030-12-31'),
      isActive: false,
      usageLimit: 100,
      userUsageLimit: 1,
      firstOrderOnly: false,
    },
  ];

  for (const c of sampleCoupons) {
    await Coupon.findOneAndUpdate(
      { code: c.code },
      { $set: c },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    log(`  ✓ Coupon: [${c.code}] ${c.description} (${c.isActive ? 'Active' : 'Inactive'})`);
  }
};

/**
 * Main safe seeding runner
 * Uses upserts based on unique slugs to ensure re-run safety without duplicates
 */
export const runDatabaseSeed = async () => {
  console.log('====================================================');
  console.log(' Starting ShopEasy Database Seed (Stage 2)');
  console.log('====================================================');

  try {
    // 1. Establish database connection
    await connectDatabase();

    // 2. Seed data
    await seedCatalogAndUsers(false);

    console.log('====================================================');
    console.log(' Database seed completed successfully!');
    console.log('====================================================');
  } catch (error) {
    console.error(`\n[Seed] Seed process encountered an error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
};

// Auto-execute if script is invoked directly from CLI
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runDatabaseSeed();
}

export { categoriesData, rawProductsData };
export default runDatabaseSeed;
