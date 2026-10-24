import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { slugify } from '../utils/helpers.js';

/**
 * 7 Product Categories ensuring comprehensive coverage:
 * - Electronics & Gadgets
 * - Clothing & Apparel
 * - Footwear
 * - Home & Kitchen
 * - Beauty & Personal Care
 * - Books & Stationery
 * - Accessories
 */
const categoriesToSeed = [
  {
    name: 'Electronics & Gadgets',
    slug: 'electronics-gadgets',
    description: 'High-performance audio, computing, smart devices, and mobile gear.',
    imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Clothing & Apparel',
    slug: 'clothing-apparel',
    description: 'Comfortable everyday wear, active performance apparel, and modern essentials.',
    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    description: 'Running shoes, casual sneakers, formal leather boots, and athletic footwear.',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Smart appliances, ergonomic cookware, interior decor, and living comforts.',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    description: 'Dermatological skincare, botanical oils, grooming tools, and wellness care.',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Books & Stationery',
    slug: 'books-stationery',
    description: 'Bestselling software engineering books, self-improvement, and luxury journals.',
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Automatic chronographs, Italian leather wallets, sunglasses, and bags.',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  },
];

/**
 * 56 Varied Demonstration Products (8 per category)
 * All prices specified in integer PAISE (1 INR = 100 Paise)
 */
const demonstrationProducts = [
  // ==========================================
  // 1. ELECTRONICS & GADGETS (8 Products)
  // ==========================================
  {
    name: 'SoundPulse ANC Wireless Headphones',
    sku: 'SE-ELC-001',
    categorySlug: 'electronics-gadgets',
    brand: 'SoundPulse',
    price: 549900, // ₹5,499
    discount: 15,
    stock: 45,
    featured: true,
    description: 'Hybrid active noise cancellation headphones with custom 40mm beryllium drivers and 50-hour battery life.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'ApexPro 27-inch 4K Studio Monitor',
    sku: 'SE-ELC-002',
    categorySlug: 'electronics-gadgets',
    brand: 'ApexVision',
    price: 2799900, // ₹27,999
    discount: 10,
    stock: 20,
    featured: true,
    description: 'IPS panel with 99% DCI-P3 color reproduction, HDR600 certification, and 90W USB-C Power Delivery hub.',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'NovaTrack GPS Smart Fitness Watch',
    sku: 'SE-ELC-003',
    categorySlug: 'electronics-gadgets',
    brand: 'NovaWear',
    price: 349900, // ₹3,499
    discount: 20,
    stock: 65,
    featured: false,
    description: 'Dual-band multi-satellite GPS, continuous SpO2 monitoring, VO2 max estimation, and 14-day standby life.',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'HyperCharge 100W GaN Desktop Charger',
    sku: 'SE-ELC-004',
    categorySlug: 'electronics-gadgets',
    brand: 'VoltGrid',
    price: 249900, // ₹2,499
    discount: 0,
    stock: 90,
    featured: false,
    description: 'Next-gen Gallium Nitride power station with 3x USB-C PD 3.0 ports and 1x QC 4.0 fast charging port.',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'KeyCraft Pro Wireless Mechanical Keyboard',
    sku: 'SE-ELC-005',
    categorySlug: 'electronics-gadgets',
    brand: 'KeyCraft',
    price: 429900, // ₹4,299
    discount: 12,
    stock: 35,
    featured: false,
    description: 'Hot-swappable tactile mechanical switches, aluminum frame, sound-dampening silicone, and RGB backlighting.',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'AeroClick Ergonomic Vertical Mouse',
    sku: 'SE-ELC-006',
    categorySlug: 'electronics-gadgets',
    brand: 'ErgoTech',
    price: 189900, // ₹1,899
    discount: 5,
    stock: 55,
    featured: false,
    description: '57-degree vertical handshake angle design, optical tracking sensor with adjustable DPI, and silent clicks.',
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'SoundPod Mini Bluetooth 5.3 Speaker',
    sku: 'SE-ELC-007',
    categorySlug: 'electronics-gadgets',
    brand: 'SoundPulse',
    price: 199900, // ₹1,999
    discount: 25,
    stock: 80,
    featured: false,
    description: 'IP67 dust and waterproof compact outdoor speaker with rich punchy bass and 18-hour continuous playtime.',
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'VisionClear 4K Ultra-HD Web Camera',
    sku: 'SE-ELC-008',
    categorySlug: 'electronics-gadgets',
    brand: 'ApexVision',
    price: 329900, // ₹3,299
    discount: 0,
    stock: 40,
    featured: false,
    description: 'Sony STARVIS sensor with AI autofocus, dual noise-canceling stereo mics, and magnetic privacy cover.',
    imageUrl: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600&auto=format&fit=crop&q=80',
  },

  // ==========================================
  // 2. CLOTHING & APPAREL (8 Products)
  // ==========================================
  {
    name: 'PureCotton Classic Organic Crewneck T-Shirt',
    sku: 'SE-CLO-001',
    categorySlug: 'clothing-apparel',
    brand: 'EcoThread',
    price: 89900, // ₹899
    discount: 10,
    stock: 120,
    featured: true,
    description: '100% GOTS certified combed organic cotton tee with pre-shrunk soft enzyme wash and durable rib collar.',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'AeroDry Athletic Compression Training Tee',
    sku: 'SE-CLO-002',
    categorySlug: 'clothing-apparel',
    brand: 'ActiveFlex',
    price: 119900, // ₹1,199
    discount: 15,
    stock: 75,
    featured: false,
    description: '4-way stretch moisture-wicking quick-dry fabric engineered for intense endurance training and gym sessions.',
    imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Oxford Tailored Button-Down Formal Shirt',
    sku: 'SE-CLO-003',
    categorySlug: 'clothing-apparel',
    brand: 'SavileRow',
    price: 189900, // ₹1,899
    discount: 0,
    stock: 60,
    featured: false,
    description: 'Crisp woven long-staple cotton shirt with mother-of-pearl buttons, tailored slim fit, and easy-iron finish.',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'CloudFleece Heavyweight Pullover Hoodie',
    sku: 'SE-CLO-004',
    categorySlug: 'clothing-apparel',
    brand: 'EcoThread',
    price: 249900, // ₹2,499
    discount: 20,
    stock: 45,
    featured: true,
    description: '400 GSM heavyweight brushed fleece hoodie featuring double-layered hood and reinforced kangaroo pocket.',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'UrbanChino Stretch Slim-Fit Trousers',
    sku: 'SE-CLO-005',
    categorySlug: 'clothing-apparel',
    brand: 'SavileRow',
    price: 199900, // ₹1,999
    discount: 10,
    stock: 50,
    featured: false,
    description: 'Breathable cotton-twill chinos blended with 3% elastane for unrestricted comfort from morning meetings to evening dinners.',
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'ZenComfort High-Waisted Seamless Leggings',
    sku: 'SE-CLO-006',
    categorySlug: 'clothing-apparel',
    brand: 'ActiveFlex',
    price: 159900, // ₹1,599
    discount: 25,
    stock: 85,
    featured: false,
    description: 'Zero-seam squat-proof compression leggings with flattering supportive waistband and side drop-in phone pockets.',
    imageUrl: 'https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'StormShield All-Weather Lightweight Windbreaker',
    sku: 'SE-CLO-007',
    categorySlug: 'clothing-apparel',
    brand: 'ActiveFlex',
    price: 279900, // ₹2,799
    discount: 15,
    stock: 35,
    featured: false,
    description: 'Water-repellent ripstop nylon jacket with packable interior pouch, storm flap, and reflective night-run accents.',
    imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'BreezeLinen Relaxed Casual Summer Shirt',
    sku: 'SE-CLO-008',
    categorySlug: 'clothing-apparel',
    brand: 'EcoThread',
    price: 169900, // ₹1,699
    discount: 0,
    stock: 65,
    featured: false,
    description: '100% natural European flax linen resort shirt designed for lightweight breathability and breezy warm days.',
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
  },

  // ==========================================
  // 3. FOOTWEAR (8 Products)
  // ==========================================
  {
    name: 'Veloce Carbon Plate Road Running Shoes',
    sku: 'SE-FTW-001',
    categorySlug: 'footwear',
    brand: 'VeloceAthletics',
    price: 699900, // ₹6,999
    discount: 15,
    stock: 40,
    featured: true,
    description: 'Supercritical nitrogen-infused foam midsole embedded with full-length carbon fibre propulsion plate for personal bests.',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'CourtClassic Minimalist White Leather Sneakers',
    sku: 'SE-FTW-002',
    categorySlug: 'footwear',
    brand: 'UrbanStep',
    price: 349900, // ₹3,499
    discount: 10,
    stock: 55,
    featured: true,
    description: 'Full-grain Nappa calfskin leather upper, vulcanized rubber cupsole, and cushioned memory foam insole.',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'TrailBlazer Waterproof Trekking Boots',
    sku: 'SE-FTW-003',
    categorySlug: 'footwear',
    brand: 'VeloceAthletics',
    price: 529900, // ₹5,299
    discount: 0,
    stock: 30,
    featured: false,
    description: 'HydroGuard breathable waterproof membrane with deep-lug Vibram outsole and reinforced protective toe cap.',
    imageUrl: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Oxford Heritage Goodyear Welted Brogues',
    sku: 'SE-FTW-004',
    categorySlug: 'footwear',
    brand: 'SavileRow',
    price: 599900, // ₹5,999
    discount: 20,
    stock: 25,
    featured: false,
    description: 'Handcrafted full-grain leather dress shoes with decorative brogue wingtip perforation and resolable welted sole.',
    imageUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'CloudStride Slip-On Everyday Loafers',
    sku: 'SE-FTW-005',
    categorySlug: 'footwear',
    brand: 'UrbanStep',
    price: 249900, // ₹2,499
    discount: 12,
    stock: 60,
    featured: false,
    description: 'Soft suede driving loafers with flexible pebble sole and antibacterial leather-lined footbed.',
    imageUrl: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'AeroBounce Daily Cushion Running Trainers',
    sku: 'SE-FTW-006',
    categorySlug: 'footwear',
    brand: 'VeloceAthletics',
    price: 389900, // ₹3,899
    discount: 18,
    stock: 50,
    featured: false,
    description: 'Engineered jacquard mesh upper with plush dual-density EVA cushioning for effortless high-mileage road running.',
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'RetroGlide Vintage High-Top Basketball Sneakers',
    sku: 'SE-FTW-007',
    categorySlug: 'footwear',
    brand: 'UrbanStep',
    price: 419900, // ₹4,199
    discount: 0,
    stock: 45,
    featured: false,
    description: 'Padded ankle collar with retro 1980s court styling, dual-tone leather overlays, and durable herringbone traction.',
    imageUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Solace Ergonomic Arch-Support Slide Sandals',
    sku: 'SE-FTW-008',
    categorySlug: 'footwear',
    brand: 'UrbanStep',
    price: 129900, // ₹1,299
    discount: 15,
    stock: 70,
    featured: false,
    description: 'Anatomically contoured cork-latex footbed with adjustable soft microfiber buckled straps.',
    imageUrl: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&auto=format&fit=crop&q=80',
  },

  // ==========================================
  // 4. HOME & KITCHEN (8 Products)
  // ==========================================
  {
    name: 'AuraPure HEPA H13 Smart Air Purifier',
    sku: 'SE-HOM-001',
    categorySlug: 'home-kitchen',
    brand: 'AuraPure',
    price: 849900, // ₹8,499
    discount: 20,
    stock: 35,
    featured: true,
    description: 'Medical-grade true HEPA filtration capturing 99.97% of airborne allergens and dust with whisper-quiet sleep mode.',
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'MasterChef Tri-Ply Stainless Steel Cookware Set',
    sku: 'SE-HOM-002',
    categorySlug: 'home-kitchen',
    brand: 'MasterChef',
    price: 649900, // ₹6,499
    discount: 15,
    stock: 25,
    featured: true,
    description: '5-piece premium stainless steel cookware set with aluminum heat core, stay-cool cast handles, and induction compatibility.',
    imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'BaristaTouch Precision Gooseneck Electric Kettle',
    sku: 'SE-HOM-003',
    categorySlug: 'home-kitchen',
    brand: 'BaristaCraft',
    price: 349900, // ₹3,499
    discount: 0,
    stock: 45,
    featured: false,
    description: '1-degree temperature precision control, built-in stopwatch timer, and counterbalanced handle for specialty pour-over coffee.',
    imageUrl: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'CastCraft Pre-Seasoned Cast Iron Dutch Oven',
    sku: 'SE-HOM-004',
    categorySlug: 'home-kitchen',
    brand: 'CastCraft',
    price: 329900, // ₹3,299
    discount: 10,
    stock: 40,
    featured: false,
    description: '5.5-quart heavy-duty cast iron pot ideal for artisan sourdough baking, slow braises, stews, and soups.',
    imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'NordicLoom Egyptian Cotton Bed Sheet Set',
    sku: 'SE-HOM-005',
    categorySlug: 'home-kitchen',
    brand: 'NordicLoom',
    price: 299900, // ₹2,999
    discount: 25,
    stock: 50,
    featured: false,
    description: '400 thread-count single-ply sateen weave sheets delivering cooling silky softness and deep mattress pockets.',
    imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'BlendMax 1200W Commercial High-Speed Blender',
    sku: 'SE-HOM-006',
    categorySlug: 'home-kitchen',
    brand: 'MasterChef',
    price: 499900, // ₹4,999
    discount: 0,
    stock: 30,
    featured: false,
    description: 'Japanese stainless steel 6-blade assembly pulverizing tough frozen fruits, ice, nuts, and fibrous greens in seconds.',
    imageUrl: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'LuminaSmart Dimmable Minimalist Desk Lamp',
    sku: 'SE-HOM-007',
    categorySlug: 'home-kitchen',
    brand: 'AuraPure',
    price: 179900, // ₹1,799
    discount: 10,
    stock: 60,
    featured: false,
    description: 'Flicker-free eye protection LED desk light with touch slider color temperature control and integrated Qi wireless charging base.',
    imageUrl: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'ScentHaven Ultrasonic Ceramic Aromatherapy Diffuser',
    sku: 'SE-HOM-008',
    categorySlug: 'home-kitchen',
    brand: 'NordicLoom',
    price: 149900, // ₹1,499
    discount: 15,
    stock: 75,
    featured: false,
    description: 'Handcrafted ceramic ultrasonic mist diffuser with ambient LED mood light and waterless automatic safety shut-off.',
    imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80',
  },

  // ==========================================
  // 5. BEAUTY & PERSONAL CARE (8 Products)
  // ==========================================
  {
    name: 'Botanica Radiance C20 Glow Face Serum',
    sku: 'SE-BTY-001',
    categorySlug: 'beauty-personal-care',
    brand: 'BotanicaOrganics',
    price: 129900, // ₹1,299
    discount: 20,
    stock: 90,
    featured: true,
    description: '20% stabilized Vitamin C complex enriched with Ferulic Acid and Hyaluronic Acid to brighten dark spots and protect against oxidation.',
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-00f72382cfdf?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'HydroPlump 72-Hour Barrier Repair Cream',
    sku: 'SE-BTY-002',
    categorySlug: 'beauty-personal-care',
    brand: 'Dermacell',
    price: 149900, // ₹1,499
    discount: 10,
    stock: 70,
    featured: true,
    description: '5-ceramide complex with bio-placenta peptides and panthenol to restore compromised skin moisture barriers.',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'PureEssence Cold-Pressed Organic Rosehip Seed Oil',
    sku: 'SE-BTY-003',
    categorySlug: 'beauty-personal-care',
    brand: 'BotanicaOrganics',
    price: 89900, // ₹899
    discount: 0,
    stock: 100,
    featured: false,
    description: 'Unrefined 100% Chilean Rosa Canina oil rich in Omega 3, 6, and 9 to support overnight cell renewal.',
    imageUrl: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'GentleFoam Amino Acid Daily Cleanser',
    sku: 'SE-BTY-004',
    categorySlug: 'beauty-personal-care',
    brand: 'Dermacell',
    price: 79900, // ₹799
    discount: 15,
    stock: 85,
    featured: false,
    description: 'pH 5.5 balanced sulfate-free gel cleanser that removes waterproof sunscreen without stripping natural skin lipids.',
    imageUrl: 'https://images.unsplash.com/photo-1556228722-d0b7b13a7c73?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'SunShield Invisible Water-Gel SPF 50+ PA++++',
    sku: 'SE-BTY-005',
    categorySlug: 'beauty-personal-care',
    brand: 'Dermacell',
    price: 99900, // ₹999
    discount: 0,
    stock: 110,
    featured: false,
    description: 'Featherlight non-comedogenic broad spectrum chemical sunscreen with zero white cast and refreshing matte finish.',
    imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'BladeCraft Precision Double-Edge Safety Razor Kit',
    sku: 'SE-BTY-006',
    categorySlug: 'beauty-personal-care',
    brand: 'BladeCraft',
    price: 189900, // ₹1,899
    discount: 25,
    stock: 45,
    featured: false,
    description: 'Heavy solid brass weighted handle safety razor including badger-style shaving brush and 10 platinum blades.',
    imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'SilkNutrient Argan & Keratin Restorative Hair Mask',
    sku: 'SE-BTY-007',
    categorySlug: 'beauty-personal-care',
    brand: 'BotanicaOrganics',
    price: 119900, // ₹1,199
    discount: 10,
    stock: 65,
    featured: false,
    description: 'Deep conditioning treatment for heat-damaged and color-treated hair infused with Moroccan argan oil and silk proteins.',
    imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'LuminaGlow Rose Quartz Facial Sculpting Roller',
    sku: 'SE-BTY-008',
    categorySlug: 'beauty-personal-care',
    brand: 'BotanicaOrganics',
    price: 69900, // ₹699
    discount: 0,
    stock: 80,
    featured: false,
    description: 'Natural Brazilian rose quartz face roller and Gua Sha tool for facial lymphatic drainage and contouring.',
    imageUrl: 'https://images.unsplash.com/photo-1590439471364-192aa70c0b53?w=600&auto=format&fit=crop&q=80',
  },

  // ==========================================
  // 6. BOOKS & STATIONERY (8 Products)
  // ==========================================
  {
    name: 'Designing Resilient Distributed Microservices',
    sku: 'SE-BKS-001',
    categorySlug: 'books-stationery',
    brand: 'CodePress',
    price: 149900, // ₹1,499
    discount: 10,
    stock: 50,
    featured: true,
    description: 'Comprehensive guide covering consensus protocols, event sourcing, transaction boundaries, and cloud resilience.',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'The Pragmatic System Architect: Principles & Patterns',
    sku: 'SE-BKS-002',
    categorySlug: 'books-stationery',
    brand: 'CodePress',
    price: 129900, // ₹1,299
    discount: 15,
    stock: 60,
    featured: true,
    description: 'Practical architectural lessons on modular monoliths, schema evolution, observability, and decoupled pipelines.',
    imageUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Artisan Heritage Hardcover Dot-Grid Journal',
    sku: 'SE-BKS-003',
    categorySlug: 'books-stationery',
    brand: 'ArtisanPaper',
    price: 79900, // ₹799
    discount: 0,
    stock: 95,
    featured: false,
    description: '160 GSM bleed-resistant bamboo paper with lay-flat binding, pen loop, dual ribbon markers, and expandable back pocket.',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Executive Brass Fountain Pen & Converter Set',
    sku: 'SE-BKS-004',
    categorySlug: 'books-stationery',
    brand: 'ArtisanPaper',
    price: 189900, // ₹1,899
    discount: 20,
    stock: 40,
    featured: false,
    description: 'Hand-finished raw solid brass body with German medium iridium nib and piston-action ink cartridge converter.',
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Deep Work & Mental Clarity Mastery Handbook',
    sku: 'SE-BKS-005',
    categorySlug: 'books-stationery',
    brand: 'CodePress',
    price: 69900, // ₹699
    discount: 0,
    stock: 80,
    featured: false,
    description: 'Actionable productivity frameworks and time-blocking methodologies for knowledge workers and software engineers.',
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Solid Walnut Wood Ergonomic Desk Organiser',
    sku: 'SE-BKS-006',
    categorySlug: 'books-stationery',
    brand: 'ArtisanPaper',
    price: 219900, // ₹2,199
    discount: 10,
    stock: 30,
    featured: false,
    description: 'Hand-carved American walnut desk tray with magnetic modular phone dock, pen cradle, and post-it note slot.',
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Fineliner Archival Waterproof Technical Pens (Set of 8)',
    sku: 'SE-BKS-007',
    categorySlug: 'books-stationery',
    brand: 'ArtisanPaper',
    price: 99900, // ₹999
    discount: 25,
    stock: 70,
    featured: false,
    description: 'Pigment-based waterproof Japanese archival ink pens ranging from 0.05mm ultra-fine up to 0.8mm brush tip.',
    imageUrl: 'https://images.unsplash.com/photo-1585336261026-6d60a48d88c0?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mastering TypeScript & Modern Frontend Architecture',
    sku: 'SE-BKS-008',
    categorySlug: 'books-stationery',
    brand: 'CodePress',
    price: 139900, // ₹1,399
    discount: 10,
    stock: 55,
    featured: false,
    description: 'Advanced type gymnastics, generic constraints, component composition, state management, and performance auditing.',
    imageUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=600&auto=format&fit=crop&q=80',
  },

  // ==========================================
  // 7. ACCESSORIES (8 Products)
  // ==========================================
  {
    name: 'Chronos Heritage Automatic Mechanical Chronograph',
    sku: 'SE-ACC-001',
    categorySlug: 'accessories',
    brand: 'Chronos',
    price: 1699900, // ₹16,999
    discount: 10,
    stock: 20,
    featured: true,
    description: 'Seiko NH35 automatic movement, scratch-proof sapphire crystal glass, 100m water resistance, and exhibition caseback.',
    imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tuscan Full-Grain Vegetable Tanned Leather Bifold',
    sku: 'SE-ACC-002',
    categorySlug: 'accessories',
    brand: 'SavileRow',
    price: 229900, // ₹2,299
    discount: 15,
    stock: 65,
    featured: true,
    description: 'Hand-burnished Italian Pueblo leather with RFID protective lining, 8 card slots, and dual currency sleeves.',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'AviatorPolarized Titanium Frame Sunglasses',
    sku: 'SE-ACC-003',
    categorySlug: 'accessories',
    brand: 'SpectraVision',
    price: 349900, // ₹3,499
    discount: 20,
    stock: 45,
    featured: false,
    description: 'Ultra-lightweight Japanese titanium wire frame fitted with hydrophobic UV400 polarized optical lenses.',
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Vanguard Weatherproof Roll-Top Commuter Backpack 24L',
    sku: 'SE-ACC-004',
    categorySlug: 'accessories',
    brand: 'VanguardGear',
    price: 499900, // ₹4,999
    discount: 0,
    stock: 35,
    featured: false,
    description: 'Cordura 1000D ballistic nylon shell, dedicated padded 16-inch laptop chamber, and Fidlock magnetic buckle closure.',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'SaddleLeather Reversible Automatic Ratchet Belt',
    sku: 'SE-ACC-005',
    categorySlug: 'accessories',
    brand: 'SavileRow',
    price: 159900, // ₹1,599
    discount: 10,
    stock: 70,
    featured: false,
    description: 'Hole-less micro-adjustable sliding track buckle with reversible dual-color Black/Cognac genuine bridle leather.',
    imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'NomadPro Compact Tech Cord Organizer Pouch',
    sku: 'SE-ACC-006',
    categorySlug: 'accessories',
    brand: 'VanguardGear',
    price: 129900, // ₹1,299
    discount: 25,
    stock: 80,
    featured: false,
    description: 'Accordion origami layout with elastic cable loops, mesh zip pockets, and weatherproof YKK AquaGuard zippers.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'TitaniumCarabiner Minimalist Key Organiser Clip',
    sku: 'SE-ACC-007',
    categorySlug: 'accessories',
    brand: 'VanguardGear',
    price: 89900, // ₹899
    discount: 0,
    stock: 90,
    featured: false,
    description: 'CNC machined Grade 5 titanium unibody clip with integrated pry-tool, bottle opener, and anti-lost key ring.',
    imageUrl: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'HeritageCanvas & Full-Grain Leather Weekender Duffel',
    sku: 'SE-ACC-008',
    categorySlug: 'accessories',
    brand: 'SavileRow',
    price: 649900, // ₹6,499
    discount: 15,
    stock: 25,
    featured: false,
    description: 'Heavy 18oz waxed cotton canvas bag trimmed with oil-tanned leather and reinforced brass studs for 3-day travel.',
    imageUrl: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&auto=format&fit=crop&q=80',
  },
];

/**
 * Seed Script: Safe, Non-Destructive Product Seeding
 */
async function seedDemonstrationCatalog() {
  console.log('====================================================');
  console.log(' ShopEasy Demonstration Product Seeding (56 Items)');
  console.log(' Non-destructive execution: Preserves existing data');
  console.log('====================================================');

  try {
    await connectDatabase();

    // 1. Ensure all categories exist without overwriting
    console.log('[1/2] Verifying Categories...');
    const categoryDocMap = new Map();

    for (const catData of categoriesToSeed) {
      let existingCat = await Category.findOne({ slug: catData.slug });
      if (!existingCat) {
        existingCat = await Category.create({
          name: catData.name,
          slug: catData.slug,
          description: catData.description,
          imageUrl: catData.imageUrl,
          isActive: true,
        });
        console.log(`  ✔ Created category: "${catData.name}" (${catData.slug})`);
      } else {
        console.log(`  ✔ Category already active: "${existingCat.name}"`);
      }
      categoryDocMap.set(catData.slug, existingCat);
    }

    // 2. Insert Products safely (skip any duplicates by SKU or slug)
    console.log('\n[2/2] Seeding Demonstration Products...');
    let insertedCount = 0;
    let skippedCount = 0;

    for (const prodData of demonstrationProducts) {
      const categoryDoc = categoryDocMap.get(prodData.categorySlug);
      if (!categoryDoc) {
        console.warn(`  ⚠ Warning: Missing category for slug "${prodData.categorySlug}". Skipping "${prodData.name}".`);
        skippedCount++;
        continue;
      }

      const generatedSlug = slugify(prodData.name);

      // Check duplicate by SKU or slug
      const existingProduct = await Product.findOne({
        $or: [{ sku: prodData.sku }, { slug: generatedSlug }],
      });

      if (existingProduct) {
        skippedCount++;
        continue;
      }

      await Product.create({
        name: prodData.name,
        slug: generatedSlug,
        sku: prodData.sku,
        description: prodData.description,
        price: prodData.price, // in paise
        category: categoryDoc._id,
        brand: prodData.brand,
        stock: prodData.stock,
        discount: prodData.discount,
        featured: prodData.featured,
        imageUrl: prodData.imageUrl,
        isActive: true,
      });

      insertedCount++;
      console.log(`  ✔ Seeded: [${prodData.sku}] "${prodData.name}" (₹${(prodData.price / 100).toFixed(2)})`);
    }

    console.log('====================================================');
    console.log(` Seeding Complete!`);
    console.log(` Total New Products Seeded: ${insertedCount}`);
    console.log(` Total Products Skipped (Already Present): ${skippedCount}`);
    console.log(` Active Demonstration Categories: ${categoriesToSeed.length}`);
    console.log('====================================================');
  } catch (error) {
    console.error('[Seeding Error]:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

seedDemonstrationCatalog();
