import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export const SearchInput = ({
  initialValue = '',
  onSearch,
  placeholder = 'Search products by name, category, brand, or SKU...',
  debounceMs = 300,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debounceTimerRef = useRef(null);
  const isFirstRender = useRef(true);

  // Synchronize internal state when external initialValue changes (e.g., URL change or filter reset)
  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  // Debounce typing to automatically trigger search without requiring Enter press
  useEffect(() => {
    // Avoid triggering search on the initial mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Do nothing if searchTerm matches the already applied initialValue
    if (searchTerm === initialValue) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onSearch(searchTerm.trim());
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, debounceMs, onSearch, initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onSearch(searchTerm.trim());
  };

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchTerm('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%', maxWidth: '520px' }}>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        aria-label="Search products"
        style={{
          width: '100%',
          padding: 'var(--space-2) 6.8rem var(--space-2) 2.5rem',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          fontSize: 'var(--font-size-sm)',
          outline: 'none',
          boxShadow: 'var(--shadow-sm)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '0.9rem',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          color: 'var(--color-text-muted)',
        }}
      >
        {loading ? (
          <Loader2 size={18} className="spin" color="var(--color-primary)" />
        ) : (
          <Search size={18} />
        )}
      </div>
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: '4.8rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        style={{
          position: 'absolute',
          right: '3px',
          top: '3px',
          bottom: '3px',
          borderRadius: 'var(--radius-full)',
          padding: '0 var(--space-3)',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        Search
      </button>
    </form>
  );
};

export default SearchInput;
