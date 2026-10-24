import React from 'react';
import { Clock, Truck, CheckCircle, XCircle, Package } from 'lucide-react';

export const OrderStatusBadge = ({ status = 'placed', style = {} }) => {
  const normalized = (status || '').toLowerCase();

  switch (normalized) {
    case 'placed':
    case 'pending':
      return (
        <span
          className="badge"
          style={{
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            padding: '2px 8px',
            borderRadius: '9999px',
            ...style,
          }}
        >
          <Clock size={12} />
          Placed
        </span>
      );

    case 'processing':
    case 'confirmed':
      return (
        <span
          className="badge"
          style={{
            backgroundColor: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            padding: '2px 8px',
            borderRadius: '9999px',
            ...style,
          }}
        >
          <Package size={12} />
          Processing
        </span>
      );

    case 'shipped':
      return (
        <span
          className="badge"
          style={{
            backgroundColor: '#f3e8ff',
            color: '#7e22ce',
            border: '1px solid #e9d5ff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            padding: '2px 8px',
            borderRadius: '9999px',
            ...style,
          }}
        >
          <Truck size={12} />
          Shipped
        </span>
      );

    case 'delivered':
      return (
        <span
          className="badge"
          style={{
            backgroundColor: '#dcfce7',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            padding: '2px 8px',
            borderRadius: '9999px',
            ...style,
          }}
        >
          <CheckCircle size={12} />
          Delivered
        </span>
      );

    case 'cancelled':
      return (
        <span
          className="badge"
          style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            padding: '2px 8px',
            borderRadius: '9999px',
            ...style,
          }}
        >
          <XCircle size={12} />
          Cancelled
        </span>
      );

    default:
      return (
        <span className="badge" style={{ textTransform: 'capitalize', ...style }}>
          {status}
        </span>
      );
  }
};

export default OrderStatusBadge;
