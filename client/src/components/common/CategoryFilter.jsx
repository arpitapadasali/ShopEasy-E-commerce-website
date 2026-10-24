import React from 'react';
import { Tag } from 'lucide-react';

/**
 * Dropdown selector for categories - ideal for responsive toolbar navigation
 */
export const CategoryDropdown = ({
  categories = [],
  selectedCategory = '',
  onSelectCategory,
  disabled = false,
}) => {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={selectedCategory}
        onChange={(e) => onSelectCategory(e.target.value)}
        disabled={disabled}
        aria-label="Filter products by category"
        style={{
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
          outline: 'none',
          minWidth: '180px',
          boxShadow: 'var(--shadow-sm)',
          transition: 'border-color var(--transition-fast)',
        }}
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat._id || cat.slug} value={cat.slug || cat._id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Scrollable pill button filter for quick category selection
 */
export const CategoryFilter = ({
  categories = [],
  selectedCategory = '',
  onSelectCategory,
}) => {
  return (
    <div
      role="group"
      aria-label="Category filter pills"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        overflowX: 'auto',
        paddingBottom: 'var(--space-2)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <button
        type="button"
        onClick={() => onSelectCategory('')}
        className="btn"
        aria-pressed={selectedCategory === ''}
        style={{
          borderRadius: 'var(--radius-full)',
          padding: 'var(--space-2) var(--space-4)',
          fontSize: 'var(--font-size-xs)',
          whiteSpace: 'nowrap',
          backgroundColor: selectedCategory === '' ? 'var(--color-primary)' : 'var(--color-surface)',
          color: selectedCategory === '' ? '#ffffff' : 'var(--color-text-secondary)',
          border: selectedCategory === '' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
          cursor: 'pointer',
        }}
      >
        All Categories
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.slug || selectedCategory === cat._id;
        return (
          <button
            key={cat._id || cat.slug}
            type="button"
            onClick={() => onSelectCategory(cat.slug || cat._id)}
            className="btn"
            aria-pressed={isSelected}
            style={{
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--font-size-xs)',
              whiteSpace: 'nowrap',
              backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
              color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
              border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            <Tag size={12} />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
