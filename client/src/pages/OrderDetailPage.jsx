import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Calendar,
  Banknote,
  MapPin,
  Truck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  FileText,
  Tag,
} from 'lucide-react';
import { orderService } from '../services/api.js';
import { OrderStatusBadge } from '../components/orders/OrderStatusBadge.jsx';
import { CancelOrderModal } from '../components/orders/CancelOrderModal.jsx';
import { formatINR } from '../utils/formatters.js';
import { downloadOrderInvoice } from '../utils/invoiceDownload.js';

export const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getOrderById(id);
      if (res.success && res.order) {
        setOrder(res.order);
      } else {
        setError('Order could not be found.');
      }
    } catch (err) {
      console.error('[OrderDetailPage] error:', err);
      setError(err.message || 'Could not load order details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloadingInvoice(true);
    setDownloadError('');
    try {
      await downloadOrderInvoice(order._id, order.orderNumber);
    } catch (err) {
      console.error('[OrderDetailPage] Invoice download failed:', err);
      setDownloadError(err.message || 'Could not download invoice.');
      setTimeout(() => setDownloadError(''), 5000);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
    }
  }, [id]);

  const handleCancelled = (cancelledOrder) => {
    setOrder(cancelledOrder);
    setActionSuccess('This order has been cancelled and its inventory restored.');
    setTimeout(() => setActionSuccess(''), 6000);
  };

  // Loading State
  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: 'var(--space-8) auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ height: '24px', width: '150px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
        <div className="card" style={{ height: '300px', backgroundColor: '#f8fafc' }} />
      </div>
    );
  }

  // Error State
  if (error || !order) {
    return (
      <div style={{ maxWidth: '540px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
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
            {error || 'The requested order does not exist or you do not have permission to view it.'}
          </p>
          <Link to="/orders" className="btn btn-primary" style={{ margin: '0 auto' }}>
            Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const { orderNumber, items, shippingDetails, totals, paymentMethod, orderStatus, createdAt } = order;
  const isCancellable = ['placed', 'pending'].includes((orderStatus || '').toLowerCase());

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={16} />
          <span>Back to My Orders</span>
        </Link>
      </div>

      {/* Action Success Alert */}
      {actionSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          backgroundColor: '#f0fdf4',
          color: '#166534',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          border: '1px solid #bbf7d0',
        }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Download Error Alert */}
      {downloadError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          border: '1px solid #fca5a5',
        }}>
          <AlertCircle size={18} />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Main Order Header Card */}
      <div className="card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 'var(--space-4)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                Order #{orderNumber}
              </h1>
              <OrderStatusBadge status={orderStatus} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              <Calendar size={13} />
              <span>Placed on {new Date(createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              {order.invoiceNumber && (
                <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
                  | Invoice: {order.invoiceNumber}
                </span>
              )}
            </div>
          </div>

          {/* Action Controls: Invoice & Cancellation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="btn btn-outline"
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                padding: 'var(--space-2) var(--space-4)',
                gap: '6px',
              }}
              title="Download Tax Invoice (PDF)"
            >
              <Download size={14} />
              <span>{downloadingInvoice ? 'Generating PDF...' : 'Download Invoice'}</span>
            </button>

            {isCancellable ? (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="btn btn-outline"
                style={{
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  padding: 'var(--space-2) var(--space-4)',
                }}
              >
                Cancel Order
              </button>
            ) : orderStatus === 'cancelled' ? (
              <span style={{ fontSize: 'var(--font-size-xs)', color: '#b91c1c', fontWeight: 'var(--font-weight-medium)' }}>
                Order Cancelled
              </span>
            ) : (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Cannot cancel once shipped
              </span>
            )}
          </div>
        </div>

        {/* Order Status Context Banner */}
        {orderStatus === 'cancelled' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
          }}>
            <XCircle size={18} />
            <span>This order was cancelled. Reserved inventory was restored to store stock.</span>
          </div>
        ) : orderStatus === 'placed' || orderStatus === 'pending' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
          }}>
            <Package size={18} />
            <span>Your order is placed and being prepared for shipment. You can cancel any time before dispatch.</span>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            backgroundColor: '#f8fafc',
            color: 'var(--color-text-secondary)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
          }}>
            <Truck size={18} color="var(--color-primary)" />
            <span>Order is in transit or completed. Contact customer support if you need assistance.</span>
          </div>
        )}
      </div>

      {/* 2-Column Details: Shipping & Payment Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Shipping Address */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>
            <MapPin size={18} />
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Shipping Address
            </h3>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6, color: 'var(--color-secondary)' }}>
            <div style={{ fontWeight: 'var(--font-weight-bold)' }}>{shippingDetails.fullName}</div>
            <div>{shippingDetails.address}</div>
            <div>{shippingDetails.city} - {shippingDetails.pinCode}</div>
            <div style={{ marginTop: 'var(--space-1)', color: 'var(--color-text-secondary)' }}>
              Phone: {shippingDetails.phone}
            </div>
          </div>
        </div>

        {/* Payment & Delivery Method */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>
            <Banknote size={18} />
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Payment Information
            </h3>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6, color: 'var(--color-secondary)' }}>
            <div style={{ fontWeight: 'var(--font-weight-bold)' }}>
              {paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : paymentMethod}
            </div>
            <div style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              {orderStatus === 'cancelled'
                ? 'No payment required (Order Cancelled)'
                : `Pay ${formatINR(totals.grandTotal)} upon arrival.`}
            </div>
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: '#16a34a', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}>
              <Truck size={14} />
              <span>Standard delivery included</span>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Items Table */}
      <div className="card" style={{ padding: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Package size={20} color="var(--color-primary)" />
          Items ({items.length})
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
              <img
                src={item.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&auto=format&fit=crop&q=80'}
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
                  e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=120&auto=format&fit=crop&q=80';
                }}
              />

              <div style={{ flex: '1 1 200px' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)', marginBottom: '2px' }}>
                  {item.name}
                </h4>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Unit Price: {formatINR(item.price)}
                </div>
              </div>

              <div style={{ minWidth: '80px', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Qty: <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>{item.quantity}</span>
              </div>

              <div style={{ minWidth: '100px', textAlign: 'right', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                {formatINR(item.subtotal)}
              </div>
            </div>
          ))}
        </div>

        {/* Cost Summary Breakdown */}
        <div style={{
          marginTop: 'var(--space-6)',
          paddingTop: 'var(--space-4)',
          borderTop: '2px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          maxWidth: '320px',
          marginLeft: 'auto',
          fontSize: 'var(--font-size-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Items Subtotal</span>
            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{formatINR(totals.itemsTotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={13} />
                Coupon ({order.couponCode || 'APPLIED'})
              </span>
              <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                -{formatINR(totals.discount)}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Delivery Fee</span>
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
            <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)' }}>Total Amount</span>
            <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
              {formatINR(totals.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      <CancelOrderModal
        order={order}
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onCancelled={handleCancelled}
      />
    </div>
  );
};

export default OrderDetailPage;
