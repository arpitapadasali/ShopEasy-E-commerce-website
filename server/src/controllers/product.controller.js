import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { slugify, escapeRegex, parseCSV, buildProductSearchFilter } from '../utils/helpers.js';

/**
 * @desc    Get paginated products with search, category filter, stock, and sorting
 * @route   GET /api/products
 * @access  Public
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      q,
      keyword,
      category,
      brand,
      sort,
      inStock,
      featured,
      minPrice,
      maxPrice,
      page = 1,
      limit = 8, // Eight products per page by default per specification
    } = req.query;

    const query = {};

    // 1. Active products only for public catalog (admin can pass includeInactive=true)
    if (req.query.includeInactive !== 'true' || req.user?.role !== 'admin') {
      query.isActive = true;
    }

    // 2. Comprehensive multi-field search (name, description, brand, sku, and category)
    const searchTerm = (search || q || keyword || '').trim();
    if (searchTerm) {
      const searchFilter = await buildProductSearchFilter(searchTerm, Category);
      if (searchFilter) {
        if (!query.$and) {
          query.$and = [];
        }
        query.$and.push(searchFilter);
      }
    }

    // 3. Category filtering (supports Category ObjectId or slug)
    if (category && typeof category === 'string' && category.trim() !== '') {
      const trimmedCat = category.trim();
      if (mongoose.Types.ObjectId.isValid(trimmedCat)) {
        query.category = trimmedCat;
      } else {
        // Resolve category slug
        const categoryDoc = await Category.findOne({ slug: trimmedCat.toLowerCase() });
        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          // Non-existent category filter results in empty product array
          return res.status(200).json({
            success: true,
            count: 0,
            total: 0,
            page: 1,
            pages: 0,
            products: [],
          });
        }
      }
    }

    // 4. Stock availability filter
    if (inStock === 'true' || req.query.stock === 'inStock') {
      query.stock = { $gt: 0 };
    }

    // 4b. Price range filtering (supports INR values converted to integer paise)
    if (minPrice !== undefined && minPrice !== '') {
      const minPaise = Math.round(parseFloat(minPrice) * 100);
      if (!isNaN(minPaise) && minPaise >= 0) {
        query.price = { ...(query.price || {}), $gte: minPaise };
      }
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      const maxPaise = Math.round(parseFloat(maxPrice) * 100);
      if (!isNaN(maxPaise) && maxPaise >= 0) {
        query.price = { ...(query.price || {}), $lte: maxPaise };
      }
    }

    // 4c. Brand filter
    if (brand && typeof brand === 'string' && brand.trim() !== '') {
      query.brand = { $regex: escapeRegex(brand.trim()), $options: 'i' };
    }

    // 5. Featured filter
    if (featured === 'true') {
      query.featured = true;
    }

    // 6. Sorting
    let sortOptions = { featured: -1, createdAt: -1 }; // Default sort
    if (sort === 'price_asc' || sort === 'price:asc' || sort === 'low_to_high') {
      sortOptions = { price: 1 };
    } else if (sort === 'price_desc' || sort === 'price:desc' || sort === 'high_to_low') {
      sortOptions = { price: -1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'name_asc') {
      sortOptions = { name: 1 };
    }

    // 7. Pagination calculations (safe bounding & parameter validation)
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const rawLimit = req.query.limit ?? req.query.pageSize;
    const limitNum = rawLimit !== undefined
      ? Math.min(50, Math.max(1, parseInt(rawLimit, 10) || 12))
      : 8;
    const skip = (pageNum - 1) * limitNum;

    // 8. Execute queries in parallel for optimal throughput
    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
    ]);

    const pages = Math.ceil(total / limitNum) || 0;

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages,
      pageSize: limitNum,
      limit: limitNum,
      products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID or slug
 * @route   GET /api/products/:id
 * @access  Public
 */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let product;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).populate('category', 'name slug description');
    } else {
      product = await Product.findOne({ slug: id.toLowerCase().trim() }).populate(
        'category',
        'name slug description'
      );
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      slug: customSlug,
      sku: customSku,
      description,
      price,
      category,
      brand,
      stock,
      discount,
      imageUrl,
      isActive,
      featured,
    } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required and must be at least 2 characters long.',
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product description is required.',
      });
    }

    // Price must be integer in paise
    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a non-negative integer representing paise (1 INR = 100 paise).',
      });
    }

    // Stock must be integer
    const parsedStock = stock !== undefined ? parseInt(stock, 10) : 0;
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a non-negative integer.',
      });
    }

    // Category reference validation
    if (!category || !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: 'A valid category ObjectId reference is required.',
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: 'The specified category does not exist.',
      });
    }

    // Slug generation
    const slug = slugify(customSlug || name);
    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: 'A product with this slug already exists. Please choose a unique name or slug.',
      });
    }

    // SKU generation and validation
    let finalSku = '';
    if (customSku && typeof customSku === 'string' && customSku.trim() !== '') {
      finalSku = customSku.trim().toUpperCase();
      const existingSku = await Product.findOne({ sku: finalSku });
      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: `A product with SKU "${finalSku}" already exists.`,
        });
      }
    } else {
      const catPrefix = (categoryExists.slug || 'PRD').split('-').map((w) => w[0]).join('').toUpperCase().slice(0, 4) || 'PRD';
      const cleanSlugPart = slug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      let candidateSku = `SE-${catPrefix}-${cleanSlugPart}`;
      let suffix = 1;
      while (await Product.findOne({ sku: candidateSku })) {
        candidateSku = `SE-${catPrefix}-${cleanSlugPart}-${suffix}`;
        suffix++;
      }
      finalSku = candidateSku;
    }

    const parsedDiscount = discount !== undefined ? Math.max(0, Math.min(100, parseFloat(discount) || 0)) : 0;

    const product = await Product.create({
      name: name.trim(),
      slug,
      sku: finalSku,
      description: description.trim(),
      price: parsedPrice,
      category,
      brand: brand?.trim() || '',
      stock: parsedStock,
      discount: parsedDiscount,
      imageUrl: imageUrl?.trim() || '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      featured: featured !== undefined ? Boolean(featured) : false,
    });

    const populatedProduct = await Product.findById(product._id).populate('category', 'name slug');

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: populatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const {
      name,
      slug: customSlug,
      sku,
      description,
      price,
      category,
      brand,
      stock,
      discount,
      imageUrl,
      isActive,
      featured,
    } = req.body;

    if (name) {
      product.name = name.trim();
      const newSlug = slugify(customSlug || name);

      const conflict = await Product.findOne({
        _id: { $ne: id },
        slug: newSlug,
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Another product with this slug already exists.',
        });
      }
      product.slug = newSlug;
    }

    if (sku !== undefined && typeof sku === 'string') {
      const sanitizedSku = sku.trim().toUpperCase();
      if (sanitizedSku !== '' && sanitizedSku !== product.sku) {
        const conflict = await Product.findOne({
          _id: { $ne: id },
          sku: sanitizedSku,
        });
        if (conflict) {
          return res.status(409).json({
            success: false,
            message: `Another product with SKU "${sanitizedSku}" already exists.`,
          });
        }
        product.sku = sanitizedSku;
      }
    }

    if (description !== undefined) product.description = description.trim();
    if (brand !== undefined) product.brand = brand.trim();
    if (discount !== undefined) {
      product.discount = Math.max(0, Math.min(100, parseFloat(discount) || 0));
    }

    if (price !== undefined) {
      const parsedPrice = parseInt(price, 10);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a non-negative integer in paise.',
        });
      }
      product.price = parsedPrice;
    }

    if (stock !== undefined) {
      const parsedStock = parseInt(stock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock must be a non-negative integer.',
        });
      }
      product.stock = parsedStock;
    }

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ObjectId reference.',
        });
      }
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: 'The specified category does not exist.',
        });
      }
      product.category = category;
    }

    if (imageUrl !== undefined) product.imageUrl = imageUrl.trim();
    if (isActive !== undefined) product.isActive = Boolean(isActive);
    if (featured !== undefined) product.featured = Boolean(featured);

    await product.save();

    const updatedProduct = await Product.findById(id).populate('category', 'name slug');

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download sample CSV template for bulk product import
 * @route   GET /api/products/sample-csv
 * @access  Private/Admin
 */
export const getSampleCSVTemplate = (req, res) => {
  const sampleCSV = `name,description,price,category,brand,imageUrl,stock,discount,featured,sku
"AuraPure Air Purifier Max","True HEPA air purifier with 3-stage filtration for large living rooms up to 500 sq ft.",8999.00,"Home & Kitchen","AuraPure","https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80",25,10,true,"SE-HOM-010"
"StridePro Carbon Road Running Shoes","Ultra-lightweight responsive road running shoes with carbon fibre propulsion plate.",6499.00,"Footwear","StridePro","https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",40,15,false,"SE-FTW-011"
"Nordic Minimalist Linen Lounge Cushion","Premium hand-woven organic linen cushion with duck-down insert for living rooms.",1299.00,"Home & Kitchen","NordicLiving","https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80",50,0,false,"SE-HOM-012"
"GlowGoddess Rosehip Facial Oil 30ml","Cold-pressed organic rosehip seed oil enriched with Vitamin E and antioxidants.",1499.00,"Beauty & Personal Care","GlowGoddess","https://images.unsplash.com/photo-1608248597359-00f72382cfdf?w=600&auto=format&fit=crop&q=80",35,20,true,"SE-BTY-013"
"Chronos Explorer Mechanical Chronograph","Automatic mechanical wristwatch featuring sapphire crystal and 100m water resistance.",14999.00,"Accessories","Chronos","https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",15,5,true,"SE-ACC-014"
"UrbanFlex Seamless Compression Leggings","High-waist moisture-wicking squat-proof compression leggings for fitness and yoga.",1899.00,"Clothing & Apparel","UrbanFlex","https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?w=600&auto=format&fit=crop&q=80",60,25,false,"SE-CLO-015"
"Mastering Clean Architecture in JavaScript","Practical software engineering guide to domain-driven design and scalable distributed patterns.",899.00,"Books & Stationery","CodePress","https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",80,10,false,"SE-BKS-016"`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="shopeasy_products_template.csv"');
  return res.status(200).send(sampleCSV);
};

/**
 * @desc    Bulk import products from CSV content
 * @route   POST /api/products/import-csv
 * @access  Private/Admin
 */
export const importProductsCSV = async (req, res, next) => {
  try {
    const rawCSV =
      typeof req.body === 'string'
        ? req.body
        : req.body?.csvData || req.body?.csv || '';

    if (!rawCSV || typeof rawCSV !== 'string' || !rawCSV.trim()) {
      return res.status(400).json({
        success: false,
        message: 'No CSV data provided. Please upload a valid CSV file or content.',
      });
    }

    const rows = parseCSV(rawCSV);
    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded CSV file is empty or does not contain data rows with headers.',
      });
    }

    // Preload categories and existing products for fast O(1) deduplication and resolution
    const [allCategories, existingProducts] = await Promise.all([
      Category.find().lean(),
      Product.find({}, 'name slug sku').lean(),
    ]);

    const categoryMap = new Map();
    allCategories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat);
      categoryMap.set(cat.slug.toLowerCase().trim(), cat);
      categoryMap.set(String(cat._id), cat);
    });

    const existingSkus = new Set(existingProducts.map((p) => p.sku?.toUpperCase()).filter(Boolean));
    const existingSlugs = new Set(existingProducts.map((p) => p.slug?.toLowerCase()).filter(Boolean));
    const existingNames = new Set(existingProducts.map((p) => p.name?.toLowerCase().trim()).filter(Boolean));

    const batchSkus = new Set();
    const batchSlugs = new Set();
    const validProducts = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // Row number in CSV file (1-indexed + header row)
      const row = rows[i];

      // Normalize row keys (support case-insensitive headers: "Product Name", "name", etc.)
      const getVal = (possibleKeys) => {
        for (const k of Object.keys(row)) {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const pk of possibleKeys) {
            if (cleanK === pk.toLowerCase().replace(/[^a-z0-9]/g, '')) {
              return String(row[k] || '').trim();
            }
          }
        }
        return '';
      };

      const name = getVal(['name', 'productname', 'title']);
      const description = getVal(['description', 'desc']);
      const priceStr = getVal(['price', 'priceinr', 'rate']);
      const categoryStr = getVal(['category', 'categoryname', 'categoryslug']);
      const brand = getVal(['brand', 'manufacturer']);
      const imageUrl = getVal(['imageurl', 'image', 'photo', 'img']);
      const stockStr = getVal(['stock', 'quantity', 'units']);
      const discountStr = getVal(['discount', 'discountpercentage', 'off']);
      const featuredStr = getVal(['featured', 'isfeatured']);
      let sku = getVal(['sku', 'code', 'productcode']).toUpperCase();

      // Row Validation
      if (!name || name.length < 2) {
        errors.push({ row: rowNum, name: name || '(Unnamed)', reason: 'Product name is required (min 2 characters).' });
        continue;
      }

      if (!description) {
        errors.push({ row: rowNum, name, reason: 'Product description is required.' });
        continue;
      }

      // Clean & Parse Price (strip ₹, INR, commas, whitespace)
      const cleanPriceStr = priceStr.replace(/[₹$,\sA-Za-z]/g, '');
      const parsedPriceFloat = parseFloat(cleanPriceStr);
      if (isNaN(parsedPriceFloat) || parsedPriceFloat < 0) {
        errors.push({ row: rowNum, name, reason: `Invalid price "${priceStr}". Price must be a non-negative number in INR.` });
        continue;
      }
      const pricePaise = Math.round(parsedPriceFloat * 100);

      // Clean & Parse Stock
      let stock = 0;
      if (stockStr) {
        const parsedStock = parseInt(stockStr, 10);
        if (isNaN(parsedStock) || parsedStock < 0) {
          errors.push({ row: rowNum, name, reason: `Invalid stock "${stockStr}". Stock must be a non-negative integer.` });
          continue;
        }
        stock = parsedStock;
      }

      // Clean & Parse Discount
      let discount = 0;
      if (discountStr) {
        const cleanDiscount = discountStr.replace(/[%,\s]/g, '');
        const parsedDiscount = parseFloat(cleanDiscount);
        if (!isNaN(parsedDiscount)) {
          discount = Math.max(0, Math.min(100, Math.round(parsedDiscount)));
        }
      }

      // Featured Flag
      const featured = ['true', 'yes', '1', 'y'].includes(featuredStr.toLowerCase());

      // Category Resolution (Lookup or auto-create)
      if (!categoryStr) {
        errors.push({ row: rowNum, name, reason: 'Category is required.' });
        continue;
      }

      let categoryDoc = categoryMap.get(categoryStr.toLowerCase()) || categoryMap.get(categoryStr);
      if (!categoryDoc) {
        // Auto-create category safely so import succeeds without manual pre-entry
        const catSlug = slugify(categoryStr) || `cat-${Date.now()}`;
        try {
          const newCategory = await Category.create({
            name: categoryStr,
            slug: catSlug,
            description: `${categoryStr} category created automatically via bulk CSV import.`,
            isActive: true,
          });
          categoryDoc = newCategory.toObject();
          categoryMap.set(categoryStr.toLowerCase(), categoryDoc);
          categoryMap.set(catSlug, categoryDoc);
          categoryMap.set(String(categoryDoc._id), categoryDoc);
        } catch (catErr) {
          errors.push({ row: rowNum, name, reason: `Could not resolve or create category "${categoryStr}".` });
          continue;
        }
      }

      // Slug & SKU Deduplication
      const slug = slugify(name);
      if (!slug) {
        errors.push({ row: rowNum, name, reason: 'Invalid product name could not produce a valid slug.' });
        continue;
      }

      if (existingSlugs.has(slug) || batchSlugs.has(slug) || existingNames.has(name.toLowerCase())) {
        errors.push({ row: rowNum, name, reason: `Duplicate product with name "${name}" or slug "${slug}" already exists.` });
        continue;
      }

      // If SKU not specified, generate standardized SKU
      if (!sku) {
        const catPrefix = (categoryDoc.slug || 'PRD').split('-').map((w) => w[0]).join('').toUpperCase().slice(0, 4) || 'PRD';
        const cleanNamePart = slug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
        let candidateSku = `SE-${catPrefix}-${cleanNamePart}`;
        let suffix = 1;
        while (existingSkus.has(candidateSku) || batchSkus.has(candidateSku)) {
          candidateSku = `SE-${catPrefix}-${cleanNamePart}-${suffix}`;
          suffix++;
        }
        sku = candidateSku;
      } else {
        if (existingSkus.has(sku) || batchSkus.has(sku)) {
          errors.push({ row: rowNum, name, reason: `Duplicate SKU "${sku}" already exists in the database or import batch.` });
          continue;
        }
      }

      // Image URL fallback check
      const fallbackUrl = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80';
      const cleanImageUrl = imageUrl && imageUrl.startsWith('http') ? imageUrl : (imageUrl || fallbackUrl);

      batchSkus.add(sku);
      batchSlugs.add(slug);

      validProducts.push({
        name,
        slug,
        sku,
        description,
        price: pricePaise,
        category: categoryDoc._id,
        brand: brand || '',
        stock,
        discount,
        featured,
        imageUrl: cleanImageUrl,
        isActive: true,
      });
    }

    // Bulk insert valid products
    let insertedCount = 0;
    if (validProducts.length > 0) {
      const inserted = await Product.insertMany(validProducts, { ordered: false });
      insertedCount = inserted.length;
    }

    return res.status(200).json({
      success: true,
      message: `Bulk import completed: ${insertedCount} product(s) imported successfully, ${errors.length} row(s) failed or skipped.`,
      summary: {
        totalRows: rows.length,
        importedCount: insertedCount,
        failedCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSampleCSVTemplate,
  importProductsCSV,
};
