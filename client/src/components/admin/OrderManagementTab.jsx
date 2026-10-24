import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Truck,
  Clock,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { adminService } from '../../services/api.js';
import { OrderStatusBadge } from '../orders/OrderStatusBadge.jsx';
import { formatINR } from '../../utils/formatters.js';

export const OrderManagementTab = ({ onOrderChanged }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Inspector & Status Change Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalOrder, setStatusModalOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 15,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const data = await adminService.getOrders(params);
      if (data.success) {
        setOrders(data.orders || []);
        setTotalPages(data.pages || 1);
        setTotalOrders(data.total || 0);
      }
    } catch (err) {
      console.error('[OrderTab] Fetch orders error:', err);
      setError(err.message || 'Failed to load customer orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const openStatusModal = (order) => {
    setStatusModalOrder(order);
    setNewStatus(order.orderStatus);
    setStatusError(null);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!statusModalOrder || !newStatus) return;

    if (newStatus === statusModalOrder.orderStatus) {
      setStatusModalOrder(null);
      return;
    }

    setSubmittingStatus(true);
    setStatusError(null);
    try {
      const res = await adminService.updateOrderStatus(statusModalOrder._id, newStatus);
      if (res.success) {
        showNotification(`Order ${statusModalOrder.orderNumber} status transitioned to "${newStatus.toUpperCase()}".`);
        setStatusModalOrder(null);
        fetchOrders();
        if (onOrderChanged) onOrderChanged();
      }
    } catch (err) {
      console.error('[OrderTab] Update status error:', err);
      setStatusError(err.response?.data?.message || err.message || 'Status transition rejected.');
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Determine allowed target statuses given current order status
  const getAllowedStatuses = (current) => {
    switch (current) {
      case 'placed':
        return ['placed', 'processing', 'shipped', 'cancelled'];
      case 'processing':
        return ['processing', 'shipped', 'cancelled'];
      case 'shipped':
        return ['shipped', 'delivered']; // Cannot cancel once shipped
      case 'delivered':
        return ['delivered']; // Terminal
      case 'cancelled':
        return ['cancelled']; // Terminal
      default:
        return ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: notification.type === 'error' ? '#fee2e2' : '#f0fdf4',
            color: notification.type === 'error' ? '#b91c1c' : '#166534',
            border: `1px solid ${notification.type === 'error' ? '#fca5a5' : '#86efac'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Control Header & Filters */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
              Customer Orders Operations ({totalOrders})
            </h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Search orders, inspect customer shipping details, and execute authorized status transitions
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            className="btn btn-outline"
            style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2)' }}
            title="Refresh orders"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          {/* Search by Order Number */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: '1 1 240px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search by order number (e.g. SE-)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-8)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'monospace',
                }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }}
              />
            </div>
            <button type="submit" className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2) var(--space-3)' }}>
              Search
            </button>
          </form>

          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            {['all', 'placed', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: 'var(--space-1) var(--space-3)',
                  textTransform: 'capitalize',
                  borderRadius: '16px',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Loading customer orders from MongoDB...
          </p>
        ) : error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: '#b91c1c' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto var(--space-2)' }} />
            <p>{error}</p>
          </div>
        ) : orders.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: 'var(--space-3)' }}>Order #</th>
                  <th style={{ padding: 'var(--space-3)' }}>Customer & Phone</th>
                  <th style={{ padding: 'var(--space-3)' }}>Shipping Destination</th>
                  <th style={{ padding: 'var(--space-3)' }}>Items</th>
                  <th style={{ padding: 'var(--space-3)' }}>Amount</th>
                  <th style={{ padding: 'var(--space-3)' }}>Status</th>
                  <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  const isTerminal = ord.orderStatus === 'delivered' || ord.orderStatus === 'cancelled';
                  return (
                    <tr key={ord._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {/* Order Number & Date */}
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                          {ord.orderNumber}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)' }}>
                          {ord.shippingDetails?.fullName || ord.user?.name || 'Customer'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          📞 {ord.shippingDetails?.phone || ord.user?.phone || '—'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          ✉️ {ord.user?.email || '—'}
                        </div>
                      </td>

                      {/* Shipping Address */}
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', maxWidth: '200px' }}>
                        <div>{ord.shippingDetails?.address}</div>
                        <div>
                          {ord.shippingDetails?.city}, PIN {ord.shippingDetails?.pinCode}
                        </div>
                      </td>

                      {/* Items Count & Preview */}
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                          {ord.items?.length || 0} items
                        </span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ord.items?.map((it) => it.name).join(', ')}
                        </div>
                      </td>

                      {/* Total Amount & COD indicator */}
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                          {formatINR(ord.totals?.grandTotal)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: ord.paymentStatus === 'paid' ? '#16a34a' : '#b45309' }}>
                          COD • {ord.paymentStatus?.toUpperCase()}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: 'var(--space-3)' }}>
                        <OrderStatusBadge status={ord.orderStatus} />
                      </td>

                      {/* Actions: Update Status & Inspect */}
                      <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="btn btn-outline"
                            style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-size-xs)' }}
                            title="Inspect Order Details"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusModal(ord)}
                            disabled={isTerminal}
                            className={`btn ${isTerminal ? 'btn-outline' : 'btn-primary'}`}
                            style={{
                              padding: 'var(--space-1) var(--space-2)',
                              fontSize: 'var(--font-size-xs)',
                              opacity: isTerminal ? 0.6 : 1,
                              cursor: isTerminal ? 'not-allowed' : 'pointer',
                            }}
                            title={isTerminal ? 'Delivered and Cancelled orders cannot be modified' : 'Update Status'}
                          >
                            <span>Status</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            No orders found matching status filter "{statusFilter}".
          </p>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)', backgroundColor: '#fafafa' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Page {page} of {totalPages} ({totalOrders} orders)
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="btn btn-outline"
                style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-3)' }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="btn btn-outline"
                style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-3)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STATUS UPDATE MODAL */}
      {statusModalOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: 'var(--space-6)',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                Update Order Status: {statusModalOrder.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {statusError && (
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
                {statusError}
              </div>
            )}

            <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Current Status:
                </span>
                <div style={{ marginTop: '4px' }}>
                  <OrderStatusBadge status={statusModalOrder.orderStatus} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '6px' }}>
                  Select New Order Status:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {getAllowedStatuses(statusModalOrder.orderStatus).map((st) => (
                    <option key={st} value={st}>
                      {st.toUpperCase()} {st === statusModalOrder.orderStatus ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic warning messages based on selection */}
              {newStatus === 'cancelled' && statusModalOrder.orderStatus !== 'cancelled' && (
                <div style={{ padding: 'var(--space-3)', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-2)' }}>
                  <RotateCcw size={16} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0, lineHeight: '1.4' }}>
                    <strong>Inventory Restoration Alert:</strong> Cancelling this order will automatically restore stock for all {statusModalOrder.items?.length || 0} order item snapshots back into inventory.
                  </p>
                </div>
              )}

              {newStatus === 'delivered' && statusModalOrder.orderStatus !== 'delivered' && (
                <div style={{ padding: 'var(--space-3)', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-2)' }}>
                  <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '0.75rem', color: '#166534', margin: 0, lineHeight: '1.4' }}>
                    <strong>Cash on Delivery:</strong> Transitioning to Delivered will automatically mark payment status as <strong>PAID</strong> and freeze the order in terminal state.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <button
                  type="button"
                  onClick={() => setStatusModalOrder(null)}
                  className="btn btn-outline"
                  style={{ fontSize: 'var(--font-size-sm)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStatus || newStatus === statusModalOrder.orderStatus}
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--font-size-sm)', gap: 'var(--space-2)' }}
                >
                  {submittingStatus && <RefreshCw size={14} className="spin" />}
                  <span>Apply Status Change</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAILS INSPECTOR MODAL */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'var(--space-6)',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                  Order #{selectedOrder.orderNumber}
                </h3>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer & Shipping Details Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', backgroundColor: '#f8fafc', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
              <div>
                <h4 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                  Customer Information
                </h4>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                  {selectedOrder.shippingDetails?.fullName}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Phone: {selectedOrder.shippingDetails?.phone}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Email: {selectedOrder.user?.email || '—'}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                  Delivery Destination
                </h4>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  {selectedOrder.shippingDetails?.address}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  {selectedOrder.shippingDetails?.city}, PIN {selectedOrder.shippingDetails?.pinCode}
                </div>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <OrderStatusBadge status={selectedOrder.orderStatus} />
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <h4 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
              Order Item Snapshots ({selectedOrder.items?.length || 0})
            </h4>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                    <th style={{ padding: 'var(--space-2)' }}>Item Name</th>
                    <th style={{ padding: 'var(--space-2)' }}>Unit Price</th>
                    <th style={{ padding: 'var(--space-2)' }}>Qty</th>
                    <th style={{ padding: 'var(--space-2)', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-2)', fontWeight: 'var(--font-weight-medium)' }}>
                        {it.name}
                      </td>
                      <td style={{ padding: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                        {formatINR(it.price)}
                      </td>
                      <td style={{ padding: 'var(--space-2)' }}>
                        {it.quantity}
                      </td>
                      <td style={{ padding: 'var(--space-2)', textAlign: 'right', fontWeight: 'var(--font-weight-bold)' }}>
                        {formatINR(it.subtotal || it.price * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Subtotal: {formatINR(selectedOrder.totals?.itemsTotal)}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Shipping: {selectedOrder.totals?.shippingFee ? formatINR(selectedOrder.totals?.shippingFee) : 'FREE'}
              </div>
              <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)', marginTop: 'var(--space-1)' }}>
                Grand Total: {formatINR(selectedOrder.totals?.grandTotal)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>
                Payment Method: Cash on Delivery ({selectedOrder.paymentStatus?.toUpperCase()})
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="btn btn-outline"
                style={{ fontSize: 'var(--font-size-sm)' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagementTab;
