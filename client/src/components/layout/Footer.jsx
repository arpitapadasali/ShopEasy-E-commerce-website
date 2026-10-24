import React from 'react';

export const Footer = () => {
  return (
    <footer style={{
      marginTop: 'auto',
      borderTop: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)',
      padding: 'var(--space-6) 0',
    }}>
      <div className="container" style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
      }}>
        <p>&copy; {new Date().getFullYear()} ShopEasy E-Commerce. All rights reserved.</p>
        <p>Stage 1: Foundation & Setup</p>
      </div>
    </footer>
  );
};
