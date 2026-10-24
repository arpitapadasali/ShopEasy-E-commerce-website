import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Calendar,
  Banknote,
  ArrowRight,
  ShoppingBag,
  AlertCircle,
  FileText,
  Download,
  Loader2,
  Tag,
} from 'lucide-react';
import { orderService } from '../services/api.js';
import { formatINR } from '../utils/formatters.js';
import { downloadOrderInvoice } from '../utils/invoiceDownload.js';

export const OrderConfirmationPage = () => {
  const { id } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadOrderInvoice(order._id, order.orderNumber);
    } catch (err) {
      setDownloadError(err.message || 'Failed to download invoice.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    // If order wasn't passed via navigation state, fetch from backend API
    if (!order && id) {
      const fetchOrder = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await orderService.getOrderById(id);
          if (res.success && res.order) {
            setOrder(res.order);
          } else {
            setError('Order details could not be found.');
          }
        } catch (err) {
          setError(err.message || 'Failed to load order details.');
        } finally {
          setLoading(false);
        }
      };

      fetchOrder();
    }
  }, [id, order]);

  // Loading State
  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading order receipt...</p>
      </div>
    );
  }

  // Error State
  if (error || !order) {
    return (
      <div style={{ maxWidth: '600px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-8)' }}>
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
            Order Not Found
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            {error || 'We could not locate this order.'}
          </p>
          <Link to="/" className="btn btn-primary" style={{ margin: '0 auto' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { orderNumber, items, shippingDetails, totals, paymentMethod, orderStatus, createdAt } = order;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Success Hero Banner */}
      <div className="card" style={{
        padding: 'var(--space-8)',
        textAlign: 'center',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#16a34a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-4)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <CheckCircle2 size={36} />
        </div>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: '#14532d', marginBottom: 'var(--space-2)' }}>
          Order Confirmed!
        </h1>
        <p style={{ color: '#166534', fontSize: 'var(--font-size-base)', maxWidth: '560px', margin: '0 auto' }}>
          Thank you for shopping with ShopEasy! Your order has been placed successfully and will be delivered shortly.
        </p>
        <div style={{
          marginTop: 'var(--space-4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-4)',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed #86efac',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-secondary)',
        }}>
          <span>Order Reference:</span>
          <span style={{ color: 'var(--color-primary)', fontFamily: 'monospace', fontSize: 'var(--font-size-base)' }}>
            {orderNumber}
          </span>
        </div>
      </div>

      {/* Order Info & Logistics Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--space-4)',
      }}>
        {/* Shipping Details */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>
            <MapPin size={18} />
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Delivery Address
            </h3>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-secondary)', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 'var(--font-weight-bold)' }}>{shippingDetails.fullName}</div>
            <div>{shippingDetails.address}</div>
            <div>{shippingDetails.city} - {shippingDetails.pinCode}</div>
            <div style={{ marginTop: 'var(--space-1)', color: 'var(--color-text-secondary)' }}>
              Phone: {shippingDetails.phone}
            </div>
          </div>
        </div>

        {/* Payment & Status */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>
            <Banknote size={18} />
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Payment Method
            </h3>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-secondary)', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 'var(--font-weight-bold)' }}>
              {paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : paymentMethod}
            </div>
            <div style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              Pay {formatINR(totals.grandTotal)} in cash or UPI to the delivery courier.
            </div>
            <div style={{ marginTop: 'var(--space-2)' }}>
              <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                Status: {orderStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Date Placed */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>
            <Calendar size={18} />
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Placed On
            </h3>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-secondary)', lineHeight: 1.6 }}>
            <div>{new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              {new Date(createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: '#16a34a', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}>
              <Truck size={14} />
              <span>Standard delivery within 3-5 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ordered Items Snapshot Table */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Package size={20} color="var(--color-primary)" />
          Items in this Order ({items.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                paddingBottom: idx === items.length - 1 ? 0 : 'var(--space-4)',
                borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--color-border)',
                flexWrap: 'wrap',
              }}
            >
              {/* Product Thumbnail */}
              <img
                src={item.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format&fit=crop&q=80'}
                alt={item.name}
                style={{
                  width: '64px',
                  height: '64px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=100&auto=format&fit=crop&q=80';
                }}
              />

              {/* Product Title and Details */}
              <div style={{ flex: '1 1 200px' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)', marginBottom: 'var(--space-1)' }}>
                  {item.name}
                </h4>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Unit Price: {formatINR(item.price)}
                </div>
              </div>

              {/* Quantity */}
              <div style={{ minWidth: '80px', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Qty: <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)' }}>{item.quantity}</span>
              </div>

              {/* Line Total */}
              <div style={{ minWidth: '100px', textAlign: 'right', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                {formatINR(item.subtotal)}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Summary Breakdown */}
        <div style={{
          marginTop: 'var(--space-6)',
          paddingTop: 'var(--space-4)',
          borderTop: '2px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          maxWidth: '340px',
          marginLeft: 'auto',
          fontSize: 'var(--font-size-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Items Subtotal</span>
            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatINR(totals.itemsTotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={14} />
                Coupon Discount {order.couponCode ? `(${order.couponCode})` : ''}
              </span>
              <span style={{ fontWeight: 'var(--font-weight-bold)' }}>-{formatINR(totals.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Shipping Delivery</span>
            <span style={{ color: '#16a34a', fontWeight: 'var(--font-weight-bold)' }}>FREE</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-3)',
            marginTop: 'var(--space-1)',
          }}>
            <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)' }}>Total (COD)</span>
            <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
              {formatINR(totals.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Post-order Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleDownloadInvoice}
          disabled={downloading}
          className="btn btn-outline"
          style={{ padding: 'var(--space-3) var(--space-6)', gap: 'var(--space-2)', display: 'inline-flex', alignItems: 'center' }}
          title="Download PDF Invoice for this order"
        >
          {downloading ? <Loader2 size={18} className="spinner" /> : <FileText size={18} color="var(--color-primary)" />}
          <span>{downloading ? 'Generating Invoice...' : 'Download Tax Invoice'}</span>
        </button>

        <Link to="/" className="btn btn-primary" style={{ padding: 'var(--space-3) var(--space-6)', gap: 'var(--space-2)' }}>
          <ShoppingBag size={18} />
          <span>Continue Shopping</span>
        </Link>
        <Link to="/profile" className="btn btn-outline" style={{ padding: 'var(--space-3) var(--space-6)', gap: 'var(--space-2)' }}>
          <span>View Account Profile</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {downloadError && (
        <div style={{ textAlign: 'center', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
          {downloadError}
        </div>
      )}
    </div>
  );
};

export default OrderConfirmationPage;
