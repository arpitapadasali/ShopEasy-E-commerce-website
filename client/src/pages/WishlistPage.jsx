import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Trash2,
  Eye,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  PackageOpen,
  Sparkles,
} from 'lucide-react';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatINR } from '../utils/formatters.js';

export const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlist, wishlistCount, loading, removeFromWishlist, actionLoading } = useWishlist();
  const { addToCart, actionLoading: cartLoading } = useCart();
  const { isAuthenticated } = useAuth();

  const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: '' });
  const [addingId, setAddingId] = useState(null);

  const showFeedback = (text, type = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage({ text: '', type: '' });
    }, 4000);
  };

  const handleAddToCart = async (product) => {
    if (!product || product.stock <= 0) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/wishlist' } });
      return;
    }

    setAddingId(product._id);
    const res = await addToCart(product._id, 1);
    setAddingId(null);

    if (res.success) {
      showFeedback(`Added "${product.name}" to your cart!`, 'success');
    } else {
      showFeedback(res.message || 'Could not add product to cart.', 'error');
    }
  };

  const handleRemove = async (productId, productName) => {
    const res = await removeFromWishlist(productId);
    if (res.success) {
      showFeedback(`Removed "${productName}" from your wishlist.`, 'info');
    }
  };

  if (loading && wishlist.length === 0) {
    return (
      <div style={{ maxWidth: '1000px', margin: 'var(--space-8) auto', padding: '0 var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-6)' }}>
          My Wishlist
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-6)' }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="card" style={{ height: '360px', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  // Filter out any nullish products (e.g., if a product was deleted from DB)
  const validProducts = wishlist.filter((item) => item && typeof item === 'object' && item._id);

  if (validProducts.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: 'var(--space-12) auto', padding: '0 var(--space-4)', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-10)' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              color: 'var(--color-danger)',
            }}
          >
            <Heart size={40} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            Your Wishlist is Empty
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
            Explore our curated catalog and save your favorite items to your personal wishlist by clicking the heart icon.
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ArrowLeft size={16} />
            <span>Start Shopping</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Heart size={28} color="var(--color-danger)" fill="var(--color-danger)" />
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
              My Wishlist
            </h1>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {validProducts.length} {validProducts.length === 1 ? 'saved product' : 'saved products'} in your personal collection
          </p>
        </div>

        <Link to="/" className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}>
          <ArrowLeft size={14} />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Global Feedback Alert */}
      {feedbackMessage.text && (
        <div
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            backgroundColor:
              feedbackMessage.type === 'error'
                ? '#fef2f2'
                : feedbackMessage.type === 'info'
                ? '#f8fafc'
                : '#f0fdf4',
            color:
              feedbackMessage.type === 'error'
                ? '#b91c1c'
                : feedbackMessage.type === 'info'
                ? 'var(--color-text-secondary)'
                : '#166534',
            border: `1px solid ${
              feedbackMessage.type === 'error'
                ? '#fecaca'
                : feedbackMessage.type === 'info'
                ? 'var(--color-border)'
                : '#bbf7d0'
            }`,
          }}
        >
          {feedbackMessage.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Wishlist Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {validProducts.map((product) => {
          const isOutOfStock = product.stock <= 0;
          const isLowStock = product.stock > 0 && product.stock <= 5;
          const hasDiscount = Boolean(product.discount && product.discount > 0);
          const effectivePrice = hasDiscount
            ? Math.round(product.price * (1 - product.discount / 100))
            : product.price;

          const fallbackImage =
            'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80';

          return (
            <article
              key={product._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Featured Badge */}
              {product.featured && (
                <span
                  className="badge"
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    left: '0.75rem',
                    backgroundColor: 'var(--color-accent)',
                    color: '#ffffff',
                    zIndex: 10,
                    fontSize: 'var(--font-size-xs)',
                    gap: '0.25rem',
                  }}
                >
                  <Sparkles size={12} />
                  Featured
                </span>
              )}

              {/* Remove from Wishlist Button */}
              <button
                type="button"
                onClick={() => handleRemove(product._id, product.name)}
                disabled={actionLoading}
                title="Remove from Wishlist"
                aria-label={`Remove ${product.name} from wishlist`}
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  zIndex: 10,
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
              >
                <Trash2 size={16} />
              </button>

              {/* Product Image Link */}
              <Link
                to={`/products/${product._id}`}
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  backgroundColor: '#f1f5f9',
                  position: 'relative',
                }}
              >
                <img
                  src={product.imageUrl || fallbackImage}
                  alt={product.name}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '210px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = fallbackImage;
                  }}
                />
                {hasDiscount && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '0.5rem',
                      left: '0.5rem',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 'var(--font-weight-bold)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {product.discount}% OFF
                  </span>
                )}
              </Link>

              {/* Product Info Body */}
              <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Brand & Category */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                  {product.brand && (
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                      {product.brand}
                    </span>
                  )}
                  {product.brand && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>•</span>}
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 'var(--font-weight-medium)' }}>
                    {product.category?.name || 'General'}
                  </span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    lineHeight: 1.4,
                    marginBottom: 'var(--space-2)',
                    minHeight: '2.8em',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  <Link to={`/products/${product._id}`} style={{ color: 'inherit' }}>
                    {product.name}
                  </Link>
                </h3>

                {/* Price Display */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                    {formatINR(effectivePrice)}
                  </span>
                  {hasDiscount && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                      {formatINR(product.price)}
                    </span>
                  )}
                </div>

                {/* Stock Badge */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: isOutOfStock ? '#fee2e2' : isLowStock ? '#fef3c7' : '#dcfce7',
                      color: isOutOfStock ? '#b91c1c' : isLowStock ? '#b45309' : '#15803d',
                      fontSize: '0.75rem',
                    }}
                  >
                    {isOutOfStock ? 'Out of Stock' : isLowStock ? `Only ${product.stock} left!` : 'In Stock'}
                  </span>
                </div>

                {/* Actions: Add to Cart & View Details */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 'var(--space-3)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={isOutOfStock || cartLoading || addingId === product._id}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      padding: 'var(--space-2)',
                      fontSize: 'var(--font-size-xs)',
                      gap: 'var(--space-1)',
                      backgroundColor: isOutOfStock ? '#f1f5f9' : undefined,
                      borderColor: isOutOfStock ? '#cbd5e1' : undefined,
                      color: isOutOfStock ? '#94a3b8' : undefined,
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ShoppingCart size={14} />
                    <span>
                      {addingId === product._id
                        ? 'Adding...'
                        : isOutOfStock
                        ? 'Out of Stock'
                        : 'Add to Cart'}
                    </span>
                  </button>

                  <Link
                    to={`/products/${product._id}`}
                    className="btn btn-outline"
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--font-size-xs)',
                      gap: 'var(--space-1)',
                    }}
                    title="View Product Details"
                  >
                    <Eye size={14} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default WishlistPage;
