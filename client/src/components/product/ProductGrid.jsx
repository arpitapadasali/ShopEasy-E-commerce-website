import React from 'react';
import { PackageX, RotateCcw } from 'lucide-react';
import { ProductCard } from './ProductCard.jsx';

export const ProductGrid = ({
  products = [],
  loading = false,
  onResetFilters,
  searchQuery = '',
  selectedCategoryName = '',
}) => {
  // 1. Loading State: 12 Skeleton Cards
  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 'var(--space-6)',
        }}
        aria-busy="true"
        aria-label="Loading products"
      >
        {Array.from({ length: 12 }).map((_, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: 0,
              height: '350px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--color-surface)',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          >
            <div style={{ height: '210px', backgroundColor: '#e2e8f0', opacity: 0.7 }} />
            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ height: '12px', width: '35%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
              <div style={{ height: '16px', width: '85%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
              <div style={{ height: '16px', width: '65%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
              <div style={{ height: '22px', width: '45%', backgroundColor: '#e2e8f0', borderRadius: '4px', marginTop: 'var(--space-3)' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. Friendly Empty State
  if (!products || products.length === 0) {
    return (
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: 'var(--space-12) var(--space-4)',
          maxWidth: '560px',
          margin: 'var(--space-6) auto',
          boxShadow: 'var(--shadow-sm)',
        }}
        role="status"
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            color: 'var(--color-text-muted)',
          }}
        >
          <PackageX size={32} />
        </div>
        <h3
          style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--space-2)',
            color: 'var(--color-secondary)',
          }}
        >
          No Products Found
        </h3>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 1.6,
            marginBottom: 'var(--space-6)',
          }}
        >
          {searchQuery && selectedCategoryName ? (
            <>
              No products found matching "<strong>{searchQuery}</strong>" in <strong>{selectedCategoryName}</strong>.
            </>
          ) : searchQuery ? (
            <>
              No products found matching "<strong>{searchQuery}</strong>". Check your spelling or try broader keywords like "shoes", "dress", or "watch".
            </>
          ) : selectedCategoryName ? (
            <>
              No products are currently available in the <strong>{selectedCategoryName}</strong> category.
            </>
          ) : (
            'We could not find any products matching your active filters. Try resetting your search or filter selections.'
          )}
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="btn btn-primary"
            style={{ margin: '0 auto', gap: 'var(--space-2)' }}
          >
            <RotateCcw size={16} />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Populated Responsive Product Grid
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 'var(--space-6)',
      }}
      aria-label="Products catalog"
    >
      {products.map((product) => (
        <ProductCard key={product._id || product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
