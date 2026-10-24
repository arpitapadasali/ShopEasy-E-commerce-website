import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Eye, ShoppingCart, Check, AlertTriangle, Heart, Star } from 'lucide-react';
import { formatINR } from '../../utils/formatters.js';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';

export const ProductCard = ({ product }) => {
  if (!product) return null;

  const navigate = useNavigate();
  const { addToCart, actionLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const { isInWishlist, toggleWishlist, actionLoading: wishlistLoading } = useWishlist();
  const [added, setAdded] = useState(false);

  const productName = product.name || product.productName || 'Unnamed Product';
  const productImageUrl = product.imageUrl || product.imageURL || '';
  const productBrand = product.brand || product.brandName || '';
  const productCategory = product.category?.name || product.categoryName || 'General';
  const stockCount = typeof product.stock === 'number'
    ? product.stock
    : (typeof product.inventoryStockUnits === 'number' ? product.inventoryStockUnits : 0);

  const isOutOfStock = stockCount <= 0;
  const isLowStock = stockCount > 0 && stockCount <= 5;
  const hasDiscount = Boolean(product.discount && product.discount > 0);

  // Calculate discounted price in paise
  const effectivePrice = hasDiscount
    ? Math.round(product.price * (1 - product.discount / 100))
    : product.price;

  const fallbackImage =
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80';

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product._id}` } });
      return;
    }

    const res = await addToCart(product._id, 1);
    if (res.success) {
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
      }, 2500);
    }
  };

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product._id}` } });
      return;
    }

    await toggleWishlist(product);
  };

  return (
    <article
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        height: '100%',
        position: 'relative',
        transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
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
            boxShadow: 'var(--shadow-sm)',
            fontSize: 'var(--font-size-xs)',
            gap: '0.25rem',
          }}
        >
          <Sparkles size={12} />
          Featured
        </span>
      )}

      {/* Stock Status Badge (Overlaid on image) */}
      <span
        className="badge"
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          backgroundColor: isOutOfStock ? '#fee2e2' : isLowStock ? '#fef3c7' : '#dcfce7',
          color: isOutOfStock ? '#b91c1c' : isLowStock ? '#b45309' : '#15803d',
          zIndex: 10,
          boxShadow: 'var(--shadow-sm)',
          fontSize: 'var(--font-size-xs)',
        }}
      >
        {isOutOfStock ? 'Out of Stock' : isLowStock ? `Only ${stockCount} left!` : `In Stock (${stockCount})`}
      </span>

      {/* Product Image */}
      <Link to={`/products/${product._id}`} style={{ display: 'block', overflow: 'hidden', backgroundColor: '#f1f5f9', position: 'relative' }}>
        <img
          src={productImageUrl || fallbackImage}
          alt={productName}
          loading="lazy"
          style={{
            width: '100%',
            height: '210px',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform var(--transition-normal)',
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackImage;
          }}
        />

        {/* Discount Tag on Image if applicable */}
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
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {product.discount}% OFF
          </span>
        )}

        {/* Wishlist Heart Toggle Button */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={wishlistLoading}
          aria-label={isInWishlist(product._id) ? 'Remove from wishlist' : 'Add to wishlist'}
          title={isInWishlist(product._id) ? 'Remove from wishlist' : 'Add to wishlist'}
          style={{
            position: 'absolute',
            bottom: '0.5rem',
            right: '0.5rem',
            zIndex: 10,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            transition: 'transform var(--transition-fast)',
          }}
        >
          <Heart
            size={16}
            color={isInWishlist(product._id) ? 'var(--color-danger)' : 'var(--color-text-secondary)'}
            fill={isInWishlist(product._id) ? 'var(--color-danger)' : 'none'}
          />
        </button>
      </Link>

      {/* Product Body */}
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Brand & Category */}
        <div style={{ marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {productBrand && (
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-secondary)',
                letterSpacing: '0.3px',
              }}
            >
              {productBrand}
            </span>
          )}
          {productBrand && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>•</span>
          )}
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {productCategory}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            lineHeight: 1.4,
            marginBottom: 'var(--space-2)',
            color: 'var(--color-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.8em',
          }}
        >
          <Link to={`/products/${product._id}`} style={{ color: 'inherit' }}>
            {productName}
          </Link>
        </h3>

        {/* Rating Snippet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Star size={13} color="#eab308" fill={product.rating > 0 ? '#eab308' : '#e2e8f0'} />
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)' }}>
              {product.rating > 0 ? Number(product.rating).toFixed(1) : 'New'}
            </span>
          </div>
          {product.numReviews > 0 && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              ({product.numReviews})
            </span>
          )}
        </div>

        {/* Price & Discount */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-secondary)',
              }}
            >
              {formatINR(effectivePrice)}
            </span>

            {hasDiscount && (
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                  textDecoration: 'line-through',
                }}
              >
                {formatINR(product.price)}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Add to Cart & View Details */}
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
          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || actionLoading}
            className={`btn ${added ? 'btn-primary' : isOutOfStock ? 'btn-outline' : 'btn-primary'}`}
            style={{
              flex: 1,
              padding: 'var(--space-2)',
              fontSize: 'var(--font-size-xs)',
              gap: 'var(--space-1)',
              backgroundColor: isOutOfStock ? '#f1f5f9' : added ? '#16a34a' : undefined,
              borderColor: isOutOfStock ? '#cbd5e1' : added ? '#16a34a' : undefined,
              color: isOutOfStock ? '#94a3b8' : undefined,
              cursor: isOutOfStock ? 'not-allowed' : 'pointer',
            }}
          >
            {added ? (
              <>
                <Check size={14} />
                <span>Added!</span>
              </>
            ) : isOutOfStock ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <ShoppingCart size={14} />
                <span>Add to Cart</span>
              </>
            )}
          </button>

          {/* Quick Details Button */}
          <Link
            to={`/products/${product._id}`}
            className="btn btn-outline"
            style={{
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--font-size-xs)',
              gap: 'var(--space-1)',
            }}
            title="View Details"
          >
            <Eye size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
