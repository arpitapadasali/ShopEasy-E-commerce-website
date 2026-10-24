import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Minus,
  Plus,
  Sparkles,
  Tag,
  Star,
  Heart,
  MessageSquare,
  Edit3,
  Trash2,
  Send,
  X,
} from 'lucide-react';
import { productService, reviewService } from '../services/api.js';
import { formatINR } from '../utils/formatters.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, actionLoading } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { isInWishlist, toggleWishlist, actionLoading: wishlistLoading } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState('');
  const [addError, setAddError] = useState('');

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Review Form State
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getProductById(id);
      if (data.success && data.product) {
        setProduct(data.product);
        setQuantity(1);
      } else {
        setError('Product not found.');
      }
    } catch (err) {
      setError(err.message || 'Product not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const data = await reviewService.getProductReviews(id);
      if (data.success) {
        setReviews(data.reviews || []);
        setReviewStats(data.stats || null);

        // If the user already reviewed, prefill if they edit
        if (data.userHasReviewed && data.userReview) {
          setEditingReviewId(data.userReview._id);
        }
      }
    } catch (err) {
      console.error('[ProductDetail] Error fetching reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [fetchProduct, fetchReviews]);

  const handleQuantityChange = (delta) => {
    if (!product) return;
    const maxAllowed = Math.min(product.stock, 10);
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= maxAllowed) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = async () => {
    if (!product || product.stock <= 0) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product._id}` } });
      return;
    }

    setAddError('');
    const res = await addToCart(product._id, quantity);
    if (res.success) {
      setAddedMessage(`Added ${quantity} unit${quantity > 1 ? 's' : ''} to your cart.`);
      setTimeout(() => {
        setAddedMessage('');
      }, 5000);
    } else {
      setAddError(res.message || 'Could not add product to cart.');
      setTimeout(() => {
        setAddError('');
      }, 5000);
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product._id}` } });
      return;
    }
    await toggleWishlist(product);
  };

  // Start editing existing review
  const handleStartEdit = (rev) => {
    setIsEditingReview(true);
    setEditingReviewId(rev._id);
    setReviewForm({
      rating: rev.rating,
      title: rev.title,
      comment: rev.comment,
    });
    setShowReviewForm(true);
    // Smooth scroll to review form
    const formElem = document.getElementById('review-form-anchor');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setIsEditingReview(false);
    setEditingReviewId(null);
    setReviewForm({ rating: 5, title: '', comment: '' });
    setShowReviewForm(false);
    setReviewError('');
  };

  // Submit new review or update existing review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product._id}` } });
      return;
    }

    if (!reviewForm.title.trim() || !reviewForm.comment.trim()) {
      setReviewError('Please provide both a review headline and detailed comments.');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      if (isEditingReview && editingReviewId) {
        // Update review
        const res = await reviewService.updateReview(editingReviewId, {
          rating: Number(reviewForm.rating),
          title: reviewForm.title.trim(),
          comment: reviewForm.comment.trim(),
        });

        if (res.success) {
          setReviewSuccess('Your review was updated successfully!');
          setIsEditingReview(false);
          setShowReviewForm(false);
          fetchReviews();
          fetchProduct();
        } else {
          setReviewError(res.message || 'Failed to update review.');
        }
      } else {
        // Create new review
        const res = await reviewService.createReview(id, {
          rating: Number(reviewForm.rating),
          title: reviewForm.title.trim(),
          comment: reviewForm.comment.trim(),
        });

        if (res.success) {
          setReviewSuccess('Thank you! Your review has been submitted.');
          setReviewForm({ rating: 5, title: '', comment: '' });
          setShowReviewForm(false);
          fetchReviews();
          fetchProduct();
        } else {
          setReviewError(res.message || 'Failed to submit review.');
        }
      }
    } catch (err) {
      setReviewError(err.message || 'An error occurred while saving your review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Delete own review
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;

    try {
      const res = await reviewService.deleteReview(reviewId);
      if (res.success) {
        setReviewSuccess('Your review was removed.');
        setIsEditingReview(false);
        setEditingReviewId(null);
        setReviewForm({ rating: 5, title: '', comment: '' });
        fetchReviews();
        fetchProduct();
      } else {
        setReviewError(res.message || 'Could not delete review.');
      }
    } catch (err) {
      setReviewError(err.message || 'Failed to delete review.');
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-8) 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          <div style={{ height: '20px', width: '120px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-8)' }}>
          <div style={{ height: '400px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-lg)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ height: '32px', width: '80%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
            <div style={{ height: '24px', width: '40%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
            <div style={{ height: '100px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
          </div>
        </div>
      </div>
    );
  }

  // 2. Error / Not Found State
  if (error || !product) {
    return (
      <div style={{ maxWidth: '540px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
        <div className="card">
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            color: '#b91c1c',
          }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            Product Not Found
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            {error || 'The product you are looking for does not exist or has been removed.'}
          </p>
          <Link to="/" className="btn btn-primary" style={{ margin: '0 auto' }}>
            <ArrowLeft size={16} />
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const inWishlist = isInWishlist(product._id);

  // Determine if current user already wrote a review
  const myReview = reviews.find(
    (r) => user && (r.user?._id === user._id || r.user === user._id)
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        <Link to="/" style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={14} /> Home
        </Link>
        <span>/</span>
        <span style={{ color: 'inherit' }}>{product.category?.name || 'Catalog'}</span>
        <span>/</span>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>{product.name}</span>
      </nav>

      {/* Main Product Showcase Card */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-8)', alignItems: 'start' }}>
          {/* Left: Product Image */}
          <div style={{
            position: 'relative',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--color-border)',
          }}>
            {product.featured && (
              <span
                className="badge"
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
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
            <img
              src={product.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'}
              alt={product.name}
              style={{
                width: '100%',
                maxHeight: '440px',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';
              }}
            />
          </div>

          {/* Right: Product Details & Purchase Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Category, Brand & SKU Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ gap: '4px' }}>
                <Tag size={12} />
                {product.category?.name || 'General Category'}
              </span>
              {product.brand && (
                <span className="badge" style={{ backgroundColor: '#f1f5f9', color: 'var(--color-secondary)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Brand: {product.brand}
                </span>
              )}
              {product.sku && (
                <span className="badge" style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontFamily: 'monospace' }}>
                  SKU: {product.sku}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)', lineHeight: 1.25 }}>
              {product.name}
            </h1>

            {/* Rating Snippet Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    fill={star <= Math.round(product.rating || 0) ? '#eab308' : '#e2e8f0'}
                    color={star <= Math.round(product.rating || 0) ? '#eab308' : '#cbd5e1'}
                  />
                ))}
              </div>
              <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-secondary)' }}>
                {product.rating > 0 ? Number(product.rating).toFixed(1) : 'No ratings yet'}
              </span>
              <a
                href="#reviews-section"
                style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', textDecoration: 'underline' }}
              >
                ({product.numReviews || 0} {product.numReviews === 1 ? 'review' : 'reviews'})
              </a>
            </div>

            {/* Price in INR with Discount calculation */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                {formatINR(
                  product.discount > 0
                    ? Math.round(product.price * (1 - product.discount / 100))
                    : product.price
                )}
              </span>
              {product.discount > 0 && (
                <>
                  <span style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                    {formatINR(product.price)}
                  </span>
                  <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 'var(--font-weight-bold)' }}>
                    {product.discount}% OFF
                  </span>
                </>
              )}
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Inclusive of all taxes
              </span>
            </div>

            {/* Stock Status Indicator */}
            <div>
              {isOutOfStock ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-danger)', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
                  <AlertCircle size={18} />
                  <span>Currently Out of Stock</span>
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', color: '#16a34a', fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
                  <CheckCircle2 size={18} />
                  <span>In Stock — {product.stock} unit(s) available</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: 'var(--space-4) 0' }}>
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                Description
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)', lineHeight: 1.6 }}>
                {product.description}
              </p>
            </div>

            {/* Success Message Banner */}
            {addedMessage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f0fdf4',
                color: '#166534',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                border: '1px solid #bbf7d0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={18} />
                  <span>{addedMessage}</span>
                </div>
                <Link
                  to="/cart"
                  style={{
                    color: '#166534',
                    fontWeight: 'var(--font-weight-bold)',
                    textDecoration: 'underline',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  View Cart
                </Link>
              </div>
            )}

            {/* Error Message Banner */}
            {addError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                border: '1px solid #fecaca',
              }}>
                <AlertCircle size={18} />
                <span>{addError}</span>
              </div>
            )}

            {/* Quantity Selector, Add to Cart & Wishlist Heart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
              {/* Quantity Counter */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isOutOfStock ? '#f1f5f9' : 'var(--color-surface)',
              }}>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={isOutOfStock || quantity <= 1 || actionLoading}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    color: quantity <= 1 || isOutOfStock ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    cursor: quantity <= 1 || isOutOfStock ? 'not-allowed' : 'pointer',
                  }}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={isOutOfStock || quantity >= Math.min(product.stock, 10) || actionLoading}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    color: quantity >= Math.min(product.stock, 10) || isOutOfStock ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    cursor: quantity >= Math.min(product.stock, 10) || isOutOfStock ? 'not-allowed' : 'pointer',
                  }}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || actionLoading}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  minWidth: '180px',
                  padding: 'var(--space-3) var(--space-6)',
                  opacity: isOutOfStock || actionLoading ? 0.6 : 1,
                  cursor: isOutOfStock || actionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                <ShoppingCart size={18} />
                {actionLoading
                  ? 'Adding...'
                  : isOutOfStock
                  ? 'Out of Stock'
                  : 'Add to Cart'}
              </button>

              {/* Heart Wishlist Toggle Button */}
              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                className="btn btn-outline"
                style={{
                  padding: 'var(--space-3)',
                  borderColor: inWishlist ? 'var(--color-danger)' : 'var(--color-border)',
                  color: inWishlist ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                  backgroundColor: inWishlist ? '#fee2e2' : 'transparent',
                  transition: 'all var(--transition-fast)',
                }}
                title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                aria-label={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart size={20} fill={inWishlist ? 'var(--color-danger)' : 'none'} />
              </button>
            </div>

            {/* Value Props & Trust Badges */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-4)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                <Truck size={16} color="var(--color-primary)" />
                <span>Fast Nationwide Delivery</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                <RotateCcw size={16} color="var(--color-primary)" />
                <span>7-Day Replacement</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                <ShieldCheck size={16} color="var(--color-primary)" />
                <span>100% Genuine Quality</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REVIEWS & RATINGS SECTION */}
      <section id="reviews-section" className="card" style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <MessageSquare size={22} color="var(--color-primary)" />
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                Customer Reviews & Ratings
              </h2>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Real feedback and ratings submitted by authenticated customers.
            </p>
          </div>

          {!showReviewForm && (
            <button
              type="button"
              onClick={() => {
                if (myReview) {
                  handleStartEdit(myReview);
                } else {
                  setIsEditingReview(false);
                  setShowReviewForm(true);
                }
              }}
              className="btn btn-primary"
              style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
            >
              <Star size={14} />
              <span>{myReview ? 'Edit Your Review' : 'Write a Review'}</span>
            </button>
          )}
        </div>

        {/* Global Review Alerts */}
        {reviewSuccess && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              border: '1px solid #bbf7d0',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{reviewSuccess}</span>
          </div>
        )}

        {reviewError && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              border: '1px solid #fecaca',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <AlertCircle size={16} />
            <span>{reviewError}</span>
          </div>
        )}

        {/* Rating Breakdown Summary Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-6)',
            padding: 'var(--space-5)',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-6)',
          }}
        >
          {/* Average Rating Score Card */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)', lineHeight: 1 }}>
              {product.rating > 0 ? Number(product.rating).toFixed(1) : '0.0'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 'var(--space-2) 0' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={18}
                  fill={s <= Math.round(product.rating || 0) ? '#eab308' : '#e2e8f0'}
                  color={s <= Math.round(product.rating || 0) ? '#eab308' : '#cbd5e1'}
                />
              ))}
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Based on {product.numReviews || 0} {product.numReviews === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          {/* Rating Distribution Bars (5 to 1) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', justifyContent: 'center' }}>
            {[5, 4, 3, 2, 1].map((starLevel) => {
              const stat = reviewStats?.distribution?.[starLevel] || { count: 0, percentage: 0 };
              return (
                <div key={starLevel} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                  <span style={{ minWidth: '45px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {starLevel} <Star size={12} fill="#eab308" color="#eab308" />
                  </span>
                  <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${stat.percentage}%`,
                        height: '100%',
                        backgroundColor: '#eab308',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ minWidth: '35px', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                    {stat.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* WRITE / EDIT REVIEW FORM */}
        {showReviewForm && (
          <div id="review-form-anchor" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                {isEditingReview ? 'Edit Your Review' : 'Write a Product Review'}
              </h3>
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Star Rating Picker */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                  Your Overall Rating (1 to 5 Stars)*
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title={`${star} Star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={28}
                        fill={star <= (hoverRating || reviewForm.rating) ? '#eab308' : '#e2e8f0'}
                        color={star <= (hoverRating || reviewForm.rating) ? '#eab308' : '#cbd5e1'}
                      />
                    </button>
                  ))}
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)', marginLeft: 'var(--space-2)' }}>
                    {hoverRating || reviewForm.rating} of 5 Stars
                  </span>
                </div>
              </div>

              {/* Review Title Input */}
              <div>
                <label htmlFor="review-title" style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
                  Review Headline*
                </label>
                <input
                  id="review-title"
                  type="text"
                  placeholder="e.g. Excellent quality and highly durable"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  maxLength={120}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
              </div>

              {/* Review Description Textarea */}
              <div>
                <label htmlFor="review-comment" style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
                  Detailed Review*
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  placeholder="Share details about what you liked, what could be improved, or how this product fit your expectations..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                  required
                  maxLength={1000}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
                >
                  <Send size={14} />
                  <span>{submittingReview ? 'Submitting...' : isEditingReview ? 'Update Review' : 'Submit Review'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submittingReview}
                  className="btn btn-outline"
                  style={{ fontSize: 'var(--font-size-xs)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* REVIEWS LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {reviewsLoading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>
              Loading customer reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                No reviews yet for this product. Be the first to share your experience!
              </p>
              {!showReviewForm && (
                <button
                  type="button"
                  onClick={() => setShowReviewForm(true)}
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
                >
                  <Star size={14} />
                  <span>Write the First Review</span>
                </button>
              )}
            </div>
          ) : (
            reviews.map((rev) => {
              const isMyReview = user && (rev.user?._id === user._id || rev.user === user._id);
              const authorName = rev.user?.name || 'Customer';

              return (
                <article
                  key={rev._id}
                  style={{
                    padding: 'var(--space-4)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isMyReview ? '#f0fdf4' : 'var(--color-surface)',
                  }}
                >
                  {/* Review Header: Author, Verified badge, Date, and Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-secondary)' }}>
                        {authorName}
                      </span>

                      {rev.isVerifiedPurchase && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 'var(--font-weight-bold)',
                            color: '#15803d',
                            backgroundColor: '#dcfce7',
                            padding: '2px 8px',
                            borderRadius: '12px',
                          }}
                        >
                          <ShieldCheck size={12} /> Verified Purchase
                        </span>
                      )}

                      {isMyReview && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 'var(--font-weight-bold)',
                            color: '#1e40af',
                            backgroundColor: '#dbeafe',
                            padding: '2px 8px',
                            borderRadius: '12px',
                          }}
                        >
                          Your Review
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>

                      {/* Edit / Delete actions for owner */}
                      {isMyReview && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(rev)}
                            className="btn btn-outline"
                            style={{ padding: '3px 8px', fontSize: '0.7rem', gap: '4px' }}
                            title="Edit your review"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev._id)}
                            className="btn btn-outline"
                            style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'var(--color-danger)', borderColor: '#fca5a5' }}
                            title="Delete your review"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: 'var(--space-2)' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        fill={star <= rev.rating ? '#eab308' : '#e2e8f0'}
                        color={star <= rev.rating ? '#eab308' : '#cbd5e1'}
                      />
                    ))}
                  </div>

                  {/* Review Title */}
                  <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)', marginBottom: 'var(--space-1)' }}>
                    {rev.title}
                  </h4>

                  {/* Review Comment */}
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {rev.comment}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductDetailPage;
