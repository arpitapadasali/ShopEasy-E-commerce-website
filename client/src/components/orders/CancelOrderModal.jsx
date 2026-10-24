import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { orderService } from '../../services/api.js';

export const CancelOrderModal = ({ order, isOpen, onClose, onCancelled }) => {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setError('');

    try {
      const res = await orderService.cancelOrder(order._id);
      if (res.success && res.order) {
        onCancelled(res.order);
        onClose();
      } else {
        throw new Error(res.message || 'Failed to cancel order.');
      }
    } catch (err) {
      console.error('[CancelOrderModal] Error:', err);
      setError(err.message || 'Failed to cancel order. Please refresh and try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--space-4)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !cancelling) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: 'var(--space-6)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={cancelling}
          style={{
            position: 'absolute',
            top: 'var(--space-4)',
            right: 'var(--space-4)',
            color: 'var(--color-text-muted)',
            cursor: cancelling ? 'not-allowed' : 'pointer',
          }}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        {/* Warning Icon & Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b91c1c',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
              Cancel Order?
            </h3>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
              Reference: {order.orderNumber}
            </span>
          </div>
        </div>

        {/* Dialog Body */}
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
          Are you sure you want to cancel this order? This action will mark your order as cancelled and restore the reserved inventory back to the store stock. This action cannot be reversed.
        </p>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-xs)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={cancelling}
            className="btn btn-outline"
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={cancelling}
            className="btn"
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              opacity: cancelling ? 0.7 : 1,
              cursor: cancelling ? 'not-allowed' : 'pointer',
            }}
          >
            {cancelling ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Yes, Cancel Order</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;
