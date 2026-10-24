import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Truck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Tag,
  X,
  Loader2,
} from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { couponService } from '../services/api.js';
import { formatINR } from '../utils/formatters.js';

export const CartPage = () => {
  const { cart, items, totalItems, subtotal, loading, actionLoading, error, updateQuantity, removeItem, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [itemError, setItemError] = useState('');
  const [itemSuccess, setItemSuccess] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState({ text: '', isError: false });

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg({ text: '', isError: false });
    try {
      const res = await couponService.validateCoupon(couponCode.trim(), subtotal);
      if (res.success && res.valid) {
        setAppliedCoupon({
          code: res.coupon.code,
          discount: res.discount,
          discountInRupees: res.discountInRupees,
        });
        setCouponMsg({ text: res.message, isError: false });
      } else {
        setCouponMsg({ text: res.message || 'Invalid coupon.', isError: true });
      }
    } catch (err) {
      setCouponMsg({ text: err.message || 'Failed to apply coupon.', isError: true });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponMsg({ text: 'Coupon removed.', isError: false });
    setTimeout(() => setCouponMsg({ text: '', isError: false }), 3000);
  };

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setItemError(msg);
      setItemSuccess('');
    } else {
      setItemSuccess(msg);
      setItemError('');
    }
    setTimeout(() => {
      setItemError('');
      setItemSuccess('');
    }, 4000);
  };

  const handleQuantityChange = async (itemId, currentQty, delta, maxStock) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;
    if (newQty > maxStock) {
      showNotification(`Cannot increase quantity. Maximum available stock is ${maxStock}.`, true);
      return;
    }

    const res = await updateQuantity(itemId, newQty);
    if (!res.success) {
      showNotification(res.message, true);
    }
  };

  const handleRemove = async (itemId, productName) => {
    const res = await removeItem(itemId);
    if (res.success) {
      showNotification(`Removed "${productName}" from your cart.`);
    } else {
      showNotification(res.message, true);
    }
  };

  // 1. Not Authenticated State
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '600px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            color: 'var(--color-primary)',
          }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            Sign In to View Your Cart
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
            Your shopping cart is persistently saved to your ShopEasy account across all devices. Please sign in to continue shopping.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: 'var(--space-2) var(--space-6)' }}>
              Sign In
            </Link>
            <Link to="/" className="btn btn-outline" style={{ padding: 'var(--space-2) var(--space-6)' }}>
              Explore Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading && !cart) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'var(--space-8) 0' }}>
        <div style={{ height: '32px', width: '200px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginBottom: 'var(--space-6)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-8)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ height: '100px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)' }} />
            <div style={{ height: '100px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)' }} />
          </div>
          <div style={{ height: '260px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    );
  }

  // 3. Empty Cart State
  if (!items || items.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-10) var(--space-6)' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            color: 'var(--color-text-muted)',
          }}>
            <ShoppingBag size={36} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            Your Shopping Cart is Empty
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
            Looks like you haven't added anything to your cart yet. Discover our latest electronics, fashion, home essentials, and books!
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-6)' }}>
            <ArrowLeft size={16} />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
            Shopping Cart
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {totalItems} item{totalItems === 1 ? '' : 's'} in your bag
          </p>
        </div>
        <Link to="/" className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-1)' }}>
          <ArrowLeft size={14} />
          Continue Shopping
        </Link>
      </div>

      {/* Notifications */}
      {itemSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          backgroundColor: '#f0fdf4',
          color: '#166534',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
        }}>
          <CheckCircle2 size={16} />
          <span>{itemSuccess}</span>
        </div>
      )}
      {(itemError || error) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
        }}>
          <AlertCircle size={16} />
          <span>{itemError || error}</span>
        </div>
      )}

      {/* Main Cart Grid: Left Items List, Right Order Summary */}
      <div className="responsive-2col" style={{ alignItems: 'start' }}>
        {/* Left Column: Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;

            const isAtMaxStock = item.quantity >= product.stock;

            return (
              <div
                key={item._id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  position: 'relative',
                  flexWrap: 'wrap',
                }}
              >
                {/* Product Image */}
                <Link to={`/products/${product._id}`} style={{ flexShrink: 0 }}>
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80'}
                    alt={product.name}
                    style={{
                      width: '90px',
                      height: '90px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--color-border)',
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&auto=format&fit=crop&q=80';
                    }}
                  />
                </Link>

                {/* Product Info */}
                <div style={{ flex: '1 1 200px', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <Link
                    to={`/products/${product._id}`}
                    style={{
                      fontWeight: 'var(--font-weight-semibold)',
                      fontSize: 'var(--font-size-base)',
                      color: 'var(--color-secondary)',
                      lineHeight: 1.3,
                    }}
                  >
                    {product.name}
                  </Link>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      Unit: {formatINR(product.price)}
                    </span>
                    {product.stock <= 5 && (
                      <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 'var(--font-weight-medium)' }}>
                        Only {product.stock} left
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)',
                  flexShrink: 0,
                }}>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item._id, item.quantity, -1, product.stock)}
                    disabled={actionLoading || item.quantity <= 1}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      color: item.quantity <= 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                    }}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item._id, item.quantity, 1, product.stock)}
                    disabled={actionLoading || isAtMaxStock}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      color: isAtMaxStock ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      cursor: isAtMaxStock ? 'not-allowed' : 'pointer',
                    }}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Line Total */}
                <div style={{ minWidth: '100px', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                    {formatINR(item.itemTotal)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Line Total
                  </div>
                </div>

                {/* Remove Item Button */}
                <button
                  type="button"
                  onClick={() => handleRemove(item._id, product.name)}
                  disabled={actionLoading}
                  className="btn btn-outline"
                  title="Remove item"
                  aria-label={`Remove ${product.name} from cart`}
                  style={{
                    padding: 'var(--space-2)',
                    color: 'var(--color-danger)',
                    borderColor: 'transparent',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Column: Order Summary Card */}
        <div>
          <div className="card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'sticky', top: '5.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              Order Summary
            </h2>

            {/* Calculations Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Total Items</span>
                <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{totalItems}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatINR(subtotal)}</span>
              </div>
              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Tag size={14} />
                    Coupon Discount ({appliedCoupon.code})
                  </span>
                  <span style={{ fontWeight: 'var(--font-weight-bold)' }}>-{formatINR(appliedCoupon.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Shipping Delivery</span>
                <span style={{ color: '#16a34a', fontWeight: 'var(--font-weight-bold)' }}>FREE</span>
              </div>
            </div>

            {/* Coupon Promo Input Box */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
              {!appliedCoupon ? (
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon (e.g. WELCOME10)"
                    className="input"
                    disabled={couponLoading}
                    style={{ flex: 1, padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-outline"
                    disabled={couponLoading || !couponCode.trim()}
                    style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}
                  >
                    {couponLoading ? <Loader2 size={16} className="spinner" /> : 'Apply'}
                  </button>
                </form>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  color: '#166534',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Tag size={16} />
                    <span><strong>{appliedCoupon.code}</strong> applied</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="btn"
                    style={{ padding: '2px 6px', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
                    title="Remove coupon"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {couponMsg.text && (
                <div style={{
                  marginTop: 'var(--space-2)',
                  fontSize: '0.75rem',
                  color: couponMsg.isError ? 'var(--color-danger)' : '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {couponMsg.isError ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                  <span>{couponMsg.text}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)' }}>Total Amount</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Includes all applicable taxes</div>
              </div>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                {formatINR(Math.max(0, subtotal - (appliedCoupon?.discount || 0)))}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => navigate('/checkout', { state: { initialCoupon: appliedCoupon } })}
                className="btn btn-primary"
                style={{ width: '100%', padding: 'var(--space-3)', fontSize: 'var(--font-size-base)', justifyContent: 'center' }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} />
              </button>

              <Link
                to="/"
                className="btn btn-outline"
                style={{ width: '100%', padding: 'var(--space-2)', fontSize: 'var(--font-size-sm)', justifyContent: 'center' }}
              >
                <ArrowLeft size={16} />
                Continue Shopping
              </Link>
            </div>

            {/* Trust Badges */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-2)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <ShieldCheck size={16} color="var(--color-primary)" />
                <span>Secure 256-Bit SSL Encrypted Checkout</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Truck size={16} color="var(--color-primary)" />
                <span>Fast Nationwide Shipping on all orders</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
