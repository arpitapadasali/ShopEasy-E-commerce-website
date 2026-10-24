import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  ShieldCheck,
  Truck,
  Banknote,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  Loader2,
  Tag,
  X,
} from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { orderService, couponService } from '../services/api.js';
import { formatINR } from '../utils/formatters.js';

export const CheckoutPage = () => {
  const { cart, items, totalItems, subtotal, loading: cartLoading, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.initialCoupon || null);
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

  // Form State initialized with user profile values if available
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    pinCode: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Auto-populate shipping details from user profile
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        fullName: prev.fullName || user.name || '',
        phone: prev.phone || user.phone || '',
        address: prev.address || user.address || '',
        city: prev.city || user.city || '',
        pinCode: prev.pinCode || user.pinCode || '',
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full recipient name (min. 2 characters).';
    }

    const cleanPhone = formData.phone.trim();
    if (!cleanPhone) {
      errors.phone = 'Phone number is required for delivery coordination.';
    } else if (!/^\+?[0-9\s\-()]{10,15}$/.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit mobile or phone number.';
    }

    if (!formData.address.trim() || formData.address.trim().length < 5) {
      errors.address = 'Please enter complete street address, house/flat no. and locality.';
    }

    if (!formData.city.trim() || formData.city.trim().length < 2) {
      errors.city = 'Please enter your city or town.';
    }

    const cleanPin = formData.pinCode.trim();
    if (!cleanPin) {
      errors.pinCode = 'PIN/Postal code is required.';
    } else if (!/^\d{4,10}$/.test(cleanPin)) {
      errors.pinCode = 'Please enter a valid numeric PIN/Postal code (6 digits).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (submitting) return;

    if (!validateForm()) return;

    if (!items || items.length === 0) {
      setServerError('Your cart is empty. Please add items before checking out.');
      return;
    }

    setSubmitting(true);
    setServerError('');

    try {
      const orderPayload = {
        shippingDetails: {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          pinCode: formData.pinCode.trim(),
        },
        paymentMethod: 'cod',
        couponCode: appliedCoupon?.code || '',
      };

      const res = await orderService.createOrder(orderPayload);

      if (res.success && res.order) {
        // Refresh cart state to reflect emptied cart
        await fetchCart();
        navigate(`/order-confirmation/${res.order._id}`, {
          state: { order: res.order },
          replace: true,
        });
      } else {
        throw new Error(res.message || 'Failed to place order.');
      }
    } catch (err) {
      console.error('[Checkout] Submission error:', err);
      setServerError(err.message || 'Failed to create order. Please review your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading Cart State
  if (cartLoading && !cart) {
    return (
      <div style={{ maxWidth: '800px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading checkout details...</p>
      </div>
    );
  }

  // Empty Cart State
  if (!items || items.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-10) var(--space-6)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            color: 'var(--color-text-muted)',
          }}>
            <ShoppingBag size={32} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            Your Cart is Empty
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            You cannot proceed to checkout with an empty cart. Browse our catalog and add products first.
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ArrowLeft size={16} />
            Explore Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
            Checkout & Shipping
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Step 2 of 2: Shipping details and payment confirmation
          </p>
        </div>
        <Link to="/cart" className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-1)' }}>
          <ArrowLeft size={14} />
          Back to Cart
        </Link>
      </div>

      {/* Global Server Error Alert */}
      {serverError && (
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
          <span>{serverError}</span>
        </div>
      )}

      {/* Main Grid: Form on Left, Summary on Right */}
      <div className="responsive-2col" style={{ alignItems: 'start' }}>
        {/* Left: Shipping Address & Payment Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 }}>
          {/* Shipping Address Card */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}>
              <Truck size={20} color="var(--color-primary)" />
              1. Delivery Address
            </h2>

            <form onSubmit={handleSubmit} id="checkout-form" noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Full Name & Phone Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                  <div>
                    <label
                      htmlFor="fullName"
                      style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}
                    >
                      Full Name *
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      className="input"
                      placeholder="e.g. Aarav Sharma"
                      value={formData.fullName}
                      onChange={handleChange}
                      disabled={submitting}
                      style={{ borderColor: formErrors.fullName ? 'var(--color-danger)' : undefined }}
                    />
                    {formErrors.fullName && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '2px', display: 'block' }}>
                        {formErrors.fullName}
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}
                    >
                      Phone Number (10 digits) *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="input"
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={submitting}
                      style={{ borderColor: formErrors.phone ? 'var(--color-danger)' : undefined }}
                    />
                    {formErrors.phone && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '2px', display: 'block' }}>
                        {formErrors.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <label
                    htmlFor="address"
                    style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}
                  >
                    Street Address / Flat / Locality *
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    className="input"
                    placeholder="House / Flat No., Street, Building, Locality, Landmark"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={submitting}
                    style={{ borderColor: formErrors.address ? 'var(--color-danger)' : undefined, resize: 'vertical' }}
                  />
                  {formErrors.address && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '2px', display: 'block' }}>
                      {formErrors.address}
                    </span>
                  )}
                </div>

                {/* City & PIN Code Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                  <div>
                    <label
                      htmlFor="city"
                      style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}
                    >
                      City / Town *
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      className="input"
                      placeholder="e.g. Bengaluru"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={submitting}
                      style={{ borderColor: formErrors.city ? 'var(--color-danger)' : undefined }}
                    />
                    {formErrors.city && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '2px', display: 'block' }}>
                        {formErrors.city}
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="pinCode"
                      style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}
                    >
                      PIN / Postal Code *
                    </label>
                    <input
                      id="pinCode"
                      name="pinCode"
                      type="text"
                      className="input"
                      placeholder="e.g. 560038"
                      value={formData.pinCode}
                      onChange={handleChange}
                      disabled={submitting}
                      style={{ borderColor: formErrors.pinCode ? 'var(--color-danger)' : undefined }}
                    />
                    {formErrors.pinCode && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '2px', display: 'block' }}>
                        {formErrors.pinCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Payment Method Card */}
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}>
              <Banknote size={20} color="var(--color-primary)" />
              2. Payment Method
            </h2>

            {/* Selected Method: Cash on Delivery */}
            <div style={{
              border: '2px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
            }}>
              <input
                type="radio"
                id="payment-cod"
                name="paymentMethod"
                value="cod"
                checked={true}
                readOnly
                style={{ marginTop: '4px', accentColor: 'var(--color-primary)' }}
              />
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="payment-cod"
                  style={{
                    fontWeight: 'var(--font-weight-bold)',
                    color: 'var(--color-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    cursor: 'pointer',
                  }}
                >
                  Cash on Delivery (COD)
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                    Standard
                  </span>
                </label>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                  Pay comfortably using cash or scan UPI upon doorstep delivery. No advance online payment required.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Order Items & Pricing Breakdown */}
        <div>
          <div className="card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'sticky', top: '5.5rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              Order Review ({totalItems} items)
            </h2>

            {/* Item Thumbnails Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: '240px', overflowY: 'auto' }}>
              {items.map((item) => (
                <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
                  <img
                    src={item.product?.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format&fit=crop&q=80'}
                    alt={item.product?.name}
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=100&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'var(--font-weight-medium)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product?.name}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      Qty: {item.quantity} × {formatINR(item.product?.price)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)' }}>
                    {formatINR(item.itemTotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Items Subtotal</span>
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
                <span style={{ color: 'var(--color-text-secondary)' }}>Standard Delivery</span>
                <span style={{ color: '#16a34a', fontWeight: 'var(--font-weight-bold)' }}>FREE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Payment Option</span>
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>Cash on Delivery</span>
              </div>
            </div>

            {/* Promo / Coupon Input */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
              {!appliedCoupon ? (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code (e.g. WELCOME10)"
                    className="input"
                    disabled={couponLoading}
                    style={{ flex: 1, padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase' }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="btn btn-outline"
                    disabled={couponLoading || !couponCode.trim()}
                    style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}
                  >
                    {couponLoading ? <Loader2 size={16} className="spinner" /> : 'Apply'}
                  </button>
                </div>
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

            {/* Grand Total */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)' }}>Grand Total</span>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Pay upon delivery (All taxes incl.)</div>
              </div>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                {formatINR(Math.max(0, subtotal - (appliedCoupon?.discount || 0)))}
              </span>
            </div>

            {/* Place Order CTA */}
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-bold)',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Confirm & Place Order (COD)</span>
                </>
              )}
            </button>

            {/* Security Guarantee */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', justifyContent: 'center' }}>
              <Lock size={14} color="var(--color-primary)" />
              <span>Safe & Confidential. No online banking details needed.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
