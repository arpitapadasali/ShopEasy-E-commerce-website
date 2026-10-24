import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Calendar,
  Banknote,
  ArrowRight,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  Tag,
} from 'lucide-react';
import { orderService } from '../services/api.js';
import { OrderStatusBadge } from '../components/orders/OrderStatusBadge.jsx';
import { CancelOrderModal } from '../components/orders/CancelOrderModal.jsx';
import { formatINR } from '../utils/formatters.js';
import { downloadOrderInvoice } from '../utils/invoiceDownload.js';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  // Selected order for cancellation modal
  const [orderToCancel, setOrderToCancel] = useState(null);

  const handleDownloadInvoice = async (e, orderId, orderNumber) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setDownloadingId(orderId);
    setDownloadError('');
    try {
      await downloadOrderInvoice(orderId, orderNumber);
    } catch (err) {
      console.error('[OrdersPage] Download failed:', err);
      setDownloadError(err.message || 'Failed to download invoice.');
      setTimeout(() => setDownloadError(''), 5000);
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getMyOrders();
      if (res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else {
        setError('Failed to fetch your order history.');
      }
    } catch (err) {
      console.error('[OrdersPage] fetch error:', err);
      setError(err.message || 'Could not load your orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOrderCancelled = (cancelledOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o._id === cancelledOrder._id ? cancelledOrder : o))
    );
    setSuccessMessage(`Order ${cancelledOrder.orderNumber} has been successfully cancelled.`);
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ height: '32px', width: '220px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginBottom: 'var(--space-4)' }} />
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ height: '160px', backgroundColor: '#f8fafc' }} />
        ))}
      </div>
    );
  }

  // Error State
  if (error) {
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
            Error Loading Orders
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>{error}</p>
          <button type="button" onClick={fetchOrders} className="btn btn-primary" style={{ margin: '0 auto' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (!orders || orders.length === 0) {
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
            <Package size={32} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            No Orders Yet
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
            You haven't placed any orders yet. Discover our quality products and enjoy cash on delivery!
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ShoppingBag size={16} />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
            My Orders
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {orders.length} order{orders.length === 1 ? '' : 's'} placed
          </p>
        </div>
        <Link to="/" className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)' }}>
          Continue Shopping
        </Link>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
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
          <span>{successMessage}</span>
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

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {orders.map((order) => {
          const isCancellable = ['placed', 'pending'].includes((order.orderStatus || '').toLowerCase());
          const totalItemsCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

          return (
            <div
              key={order._id}
              className="card"
              style={{
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                border: '1px solid var(--color-border)',
              }}
            >
              {/* Order Card Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)', fontFamily: 'monospace' }}>
                    {order.orderNumber}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    <Calendar size={13} />
                    <span>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <OrderStatusBadge status={order.orderStatus} />
                </div>
              </div>

              {/* Order Item Thumbnails & Snapshot Preview */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-4)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', flex: 1, minWidth: '220px' }}>
                  {order.items?.slice(0, 3).map((item, idx) => (
                    <img
                      key={idx}
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      style={{
                        width: '56px',
                        height: '56px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=100&auto=format&fit=crop&q=80';
                      }}
                    />
                  ))}
                  {order.items?.length > 3 && (
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)',
                    }}>
                      +{order.items.length - 3} more
                    </div>
                  )}

                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginLeft: 'var(--space-1)' }}>
                    <div>{totalItemsCount} item{totalItemsCount === 1 ? '' : 's'}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      Pay via {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
                    </div>
                  </div>
                </div>

                {/* Total & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                      {formatINR(order.totals?.grandTotal)}
                    </div>
                    {order.totals?.discount > 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 'var(--font-weight-medium)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                        <Tag size={11} />
                        <span>Saved {formatINR(order.totals.discount)}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      Inclusive of all taxes
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={(e) => handleDownloadInvoice(e, order._id, order.orderNumber)}
                      disabled={downloadingId === order._id}
                      className="btn btn-outline"
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        padding: 'var(--space-2) var(--space-3)',
                        gap: '4px',
                      }}
                      title="Download Tax Invoice (PDF)"
                    >
                      <Download size={13} />
                      <span>{downloadingId === order._id ? '...' : 'Invoice'}</span>
                    </button>

                    {isCancellable && (
                      <button
                        type="button"
                        onClick={() => setOrderToCancel(order)}
                        className="btn btn-outline"
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: '#dc2626',
                          borderColor: '#fca5a5',
                          padding: 'var(--space-2) var(--space-3)',
                        }}
                      >
                        Cancel
                      </button>
                    )}

                    <Link
                      to={`/orders/${order._id}`}
                      className="btn btn-primary"
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        padding: 'var(--space-2) var(--space-4)',
                        gap: 'var(--space-1)',
                      }}
                    >
                      <span>View Details</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancellation Confirmation Modal */}
      <CancelOrderModal
        order={orderToCancel}
        isOpen={Boolean(orderToCancel)}
        onClose={() => setOrderToCancel(null)}
        onCancelled={handleOrderCancelled}
      />
    </div>
  );
};

export default OrdersPage;
