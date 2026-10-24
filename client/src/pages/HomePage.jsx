import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  SlidersHorizontal,
  Activity,
  AlertCircle,
  RotateCcw,
  Tag,
  Check,
} from 'lucide-react';
import { productService, categoryService, healthService } from '../services/api.js';
import { SearchInput } from '../components/common/SearchInput.jsx';
import { CategoryFilter, CategoryDropdown } from '../components/common/CategoryFilter.jsx';
import { ProductGrid } from '../components/product/ProductGrid.jsx';
import { Pagination } from '../components/common/Pagination.jsx';

export const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state parameters
  const searchQuery = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || '';
  const sortOption = searchParams.get('sort') || '';
  const inStockOnly = searchParams.get('inStock') === 'true';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Component State
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Price input states
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam);

  // Health check state
  const [healthStatus, setHealthStatus] = useState(null);

  // Synchronize price inputs with URL
  useEffect(() => {
    setMinPriceInput(minPriceParam);
    setMaxPriceInput(maxPriceParam);
  }, [minPriceParam, maxPriceParam]);

  // 1. Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getCategories();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.warn('Failed to load categories:', err.message);
      }
    };

    const fetchHealth = async () => {
      try {
        const data = await healthService.checkHealth();
        setHealthStatus(data);
      } catch (err) {
        // silently handle
      }
    };

    fetchCategories();
    fetchHealth();
  }, []);

  // 2. Fetch products whenever URL parameters change, ignoring stale responses
  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setError(null);

    const loadProducts = async () => {
      try {
        const params = {
          page: currentPage,
          limit: 12, // 12 products per page default per specification
        };

        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (sortOption) params.sort = sortOption;
        if (inStockOnly) params.inStock = 'true';
        if (minPriceParam) params.minPrice = minPriceParam;
        if (maxPriceParam) params.maxPrice = maxPriceParam;

        const data = await productService.getProducts(params);
        if (isCurrent) {
          if (data.success) {
            setProducts(data.products || []);
            setTotalProducts(data.total || 0);
            setTotalPages(data.pages || 1);
          } else {
            throw new Error(data.message || 'Failed to fetch catalog');
          }
        }
      } catch (err) {
        if (isCurrent) {
          setError(err.message || 'An error occurred while loading products.');
          setProducts([]);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isCurrent = false;
    };
  }, [searchQuery, selectedCategory, sortOption, inStockOnly, minPriceParam, maxPriceParam, currentPage]);

  // Parameter update helpers
  const updateParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams };

    // Clean up empty params
    Object.keys(merged).forEach((key) => {
      if (merged[key] === '' || merged[key] === null || merged[key] === undefined) {
        delete merged[key];
      }
    });

    setSearchParams(merged);
  };

  const handleSearch = (term) => {
    updateParams({ search: term, page: 1 });
  };

  const handleCategorySelect = (slug) => {
    updateParams({ category: slug, page: 1 });
  };

  const handleSortChange = (e) => {
    updateParams({ sort: e.target.value, page: 1 });
  };

  const handleStockToggle = (e) => {
    updateParams({ inStock: e.target.checked ? 'true' : '', page: 1 });
  };

  const handlePriceFilterSubmit = (e) => {
    e.preventDefault();
    updateParams({
      minPrice: minPriceInput.trim(),
      maxPrice: maxPriceInput.trim(),
      page: 1,
    });
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: newPage });
    const targetElement = document.getElementById('shop-products-section');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams({});
  };

  const activeCategoryObj = categories.find(
    (c) => c.slug === selectedCategory || c._id === selectedCategory
  );
  const activeCategoryName = activeCategoryObj?.name || selectedCategory;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Hero Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-10) var(--space-6)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ maxWidth: '680px', position: 'relative', zIndex: 10 }}>
          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.25)',
              color: '#60a5fa',
              marginBottom: 'var(--space-3)',
            }}
          >
            <Sparkles size={14} /> ShopEasy Product Catalog
          </span>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 'var(--font-weight-bold)',
              lineHeight: 1.2,
              marginBottom: 'var(--space-3)',
            }}
          >
            Discover Premium Products at Honest Prices
          </h1>
          <p
            style={{
              color: '#94a3b8',
              fontSize: 'var(--font-size-base)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-6)',
            }}
          >
            Browse verified electronics, apparel, accessories, and home goods sourced directly from our live MongoDB database.
          </p>
        </div>
      </section>

      {/* Product Listing Main Section */}
      <section
        id="shop-products-section"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
      >
        {/* Section Heading & Product Counter Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: 'var(--space-4)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-secondary)',
                letterSpacing: '-0.02em',
                marginBottom: 'var(--space-1)',
              }}
            >
              Shop Our Products
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
              Search across our complete catalog, filter by category, and find what you need.
            </p>
          </div>

          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-primary)',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            aria-live="polite"
          >
            <strong>{totalProducts}</strong> {totalProducts === 1 ? 'Product Available' : 'Products Available'}
          </div>
        </div>

        {/* Search Bar & Category Filter Controls Above the Product Grid */}
        <div
          className="card"
          style={{
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          {/* Row 1: Search Input & Category Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            {/* Search Input with 300ms Debounce and Clear Button */}
            <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
              <SearchInput
                initialValue={searchQuery}
                onSearch={handleSearch}
                loading={loading}
                debounceMs={300}
                placeholder="Search products by name, brand, or description..."
              />
            </div>

            {/* Category Dropdown Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <label
                htmlFor="category-select"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Category:
              </label>
              <CategoryDropdown
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={handleCategorySelect}
              />
            </div>
          </div>

          {/* Row 2: Category Quick-Pills Filter */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
            />
          </div>

          {/* Row 3: Sort, Stock Toggle & Price Filter Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            {/* Active Status & Filter Summary */}
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Showing <strong>{products.length}</strong> of <strong>{totalProducts}</strong> products
              {selectedCategory && (
                <span> in <strong>{activeCategoryName}</strong></span>
              )}
              {searchQuery && (
                <span> matching "<strong>{searchQuery}</strong>"</span>
              )}
            </div>

            {/* Filter Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              {/* Price Range Filter Form */}
              <form onSubmit={handlePriceFilterSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
                  Price (₹):
                </span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  style={{
                    width: '70px',
                    padding: 'var(--space-1) var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-xs)',
                    outline: 'none',
                  }}
                  min="0"
                  aria-label="Minimum price in Rupees"
                />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  style={{
                    width: '70px',
                    padding: 'var(--space-1) var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-xs)',
                    outline: 'none',
                  }}
                  min="0"
                  aria-label="Maximum price in Rupees"
                />
                <button
                  type="submit"
                  className="btn btn-outline"
                  style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-size-xs)' }}
                >
                  Apply
                </button>
              </form>

              {/* In-Stock Only Toggle */}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={handleStockToggle}
                  style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
                In-Stock Only
              </label>

              {/* Sort Dropdown */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
                  Sort:
                </span>
                <select
                  value={sortOption}
                  onChange={handleSortChange}
                  aria-label="Sort products"
                  style={{
                    padding: 'var(--space-1) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">Featured & Relevant</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>

              {/* Reset All Filters Button (Visible when filters are active) */}
              {(searchQuery || selectedCategory || minPriceParam || maxPriceParam || inStockOnly || sortOption) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-outline"
                  style={{
                    padding: 'var(--space-1) var(--space-2)',
                    fontSize: 'var(--font-size-xs)',
                    color: '#b91c1c',
                    borderColor: '#fca5a5',
                    gap: '0.25rem',
                  }}
                  title="Clear all active filters"
                >
                  <RotateCcw size={12} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* API Error Notification */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
            }}
            role="alert"
          >
            <AlertCircle size={20} />
            <span>Error loading catalog: {error}</span>
          </div>
        )}

        {/* Product Grid (12 items per page default, Skeleton Loading, Empty State) */}
        <div>
          <ProductGrid
            products={products}
            loading={loading}
            onResetFilters={handleResetFilters}
            searchQuery={searchQuery}
            selectedCategoryName={activeCategoryName}
          />

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </section>

      {/* Backend & Live Database Status Card */}
      {healthStatus && (
        <section className="card" style={{ marginTop: 'var(--space-4)', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Activity size={18} color="var(--color-primary)" />
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
                Live Cloud Catalog Backend
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              <span>Database: <strong style={{ color: '#16a34a' }}>{healthStatus.database?.toUpperCase()}</strong></span>
              <span>Uptime: {healthStatus.uptime}</span>
              <span>Stage: {healthStatus.stage}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
