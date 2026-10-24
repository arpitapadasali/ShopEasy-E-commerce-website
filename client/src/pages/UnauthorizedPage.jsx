import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const UnauthorizedPage = () => {
  return (
    <div style={{ maxWidth: '520px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
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
        }}>
          <ShieldAlert size={32} color="#b91c1c" />
        </div>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: '#b91c1c' }}>
          403 - Access Denied
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)', margin: 'var(--space-3) 0 var(--space-6)' }}>
          You do not have the necessary administrator permissions to view this area. Access is strictly controlled on the server.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={16} />
            Return Home
          </Link>
          <Link to="/profile" className="btn btn-outline">
            View My Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
