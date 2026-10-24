import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showPageNumbers = true,
}) => {
  if (totalPages <= 1) return null;

  // Generate an intelligent window of page numbers with ellipsis
  const getPageItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items = [];
    items.push(1);

    if (currentPage > 3) {
      items.push('ellipsis-1');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      items.push(i);
    }

    if (currentPage < totalPages - 2) {
      items.push('ellipsis-2');
    }

    items.push(totalPages);
    return items;
  };

  return (
    <nav
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        marginTop: 'var(--space-8)',
        padding: 'var(--space-2) 0',
      }}
      aria-label="Product catalog pagination"
    >
      {/* Previous Page Button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="btn btn-outline"
        style={{
          padding: 'var(--space-2) var(--space-3)',
          opacity: currentPage <= 1 ? 0.45 : 1,
          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          fontSize: 'var(--font-size-sm)',
        }}
        aria-label="Previous page"
        aria-disabled={currentPage <= 1}
      >
        <ChevronLeft size={16} />
        <span>Previous</span>
      </button>

      {/* Numbered Page Buttons */}
      {showPageNumbers && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          {getPageItems().map((item, idx) => {
            if (typeof item === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: '0 var(--space-2)',
                    color: 'var(--color-text-muted)',
                    fontSize: 'var(--font-size-sm)',
                    userSelect: 'none',
                  }}
                  aria-hidden="true"
                >
                  ...
                </span>
              );
            }

            const isActive = item === currentPage;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className="btn"
                style={{
                  minWidth: '36px',
                  height: '36px',
                  padding: 0,
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: isActive ? 'var(--font-weight-bold)' : 'var(--font-weight-normal)',
                  backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isActive ? '#ffffff' : 'var(--color-text-primary)',
                  border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'background-color var(--transition-fast)',
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Page ${item}`}
              >
                {item}
              </button>
            );
          })}
        </div>
      )}

      {/* Page Count Status Info */}
      <div
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          fontWeight: 'var(--font-weight-medium)',
          padding: '0 var(--space-2)',
          whiteSpace: 'nowrap',
        }}
        aria-live="polite"
      >
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
      </div>

      {/* Next Page Button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="btn btn-outline"
        style={{
          padding: 'var(--space-2) var(--space-3)',
          opacity: currentPage >= totalPages ? 0.45 : 1,
          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          fontSize: 'var(--font-size-sm)',
        }}
        aria-label="Next page"
        aria-disabled={currentPage >= totalPages}
      >
        <span>Next</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};

export default Pagination;
