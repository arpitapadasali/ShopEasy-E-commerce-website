import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import { adminService } from '../../services/api.js';

export const CustomerManagementTab = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getCustomers();
      if (data.success && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('[CustomerTab] Fetch error:', err);
      setError(err.message || 'Failed to fetch customer directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((cust) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      cust.name?.toLowerCase().includes(term) ||
      cust.email?.toLowerCase().includes(term) ||
      cust.city?.toLowerCase().includes(term) ||
      cust.phone?.includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Control Header & Search */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                Registered Customers Directory ({customers.length})
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 'var(--font-weight-bold)',
                  color: '#166534',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '2px 6px',
                  borderRadius: '12px',
                }}
              >
                <ShieldCheck size={12} /> Sanitized Profiles
              </span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Compliant customer profile directory. Passwords, auth tokens, and security hashes are strictly excluded.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchCustomers}
            className="btn btn-outline"
            style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2)' }}
            title="Refresh customer list"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {/* Search Field */}
        <div style={{ marginTop: 'var(--space-4)', maxWidth: '360px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by customer name, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-8)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-xs)',
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
      </div>

      {/* Customers Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Loading customer profiles from MongoDB...
          </p>
        ) : error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: '#b91c1c' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto var(--space-2)' }} />
            <p>{error}</p>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: 'var(--space-3)' }}>Customer Name</th>
                  <th style={{ padding: 'var(--space-3)' }}>Contact Details</th>
                  <th style={{ padding: 'var(--space-3)' }}>City & Location</th>
                  <th style={{ padding: 'var(--space-3)' }}>Registration Date</th>
                  <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => (
                  <tr key={cust._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {/* Name */}
                    <td style={{ padding: 'var(--space-3)' }}>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)' }}>
                        {cust.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                        ID: {cust._id}
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td style={{ padding: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        <Mail size={12} color="var(--color-text-muted)" />
                        <span>{cust.email}</span>
                      </div>
                      {cust.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          <Phone size={12} />
                          <span>{cust.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Location / Address */}
                    <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <MapPin size={12} color="var(--color-text-muted)" />
                        <span>{cust.city || 'Not provided'}</span>
                        {cust.pinCode && <span>({cust.pinCode})</span>}
                      </div>
                      {cust.address && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cust.address}
                        </div>
                      )}
                    </td>

                    {/* Registration Date */}
                    <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <Calendar size={12} color="var(--color-text-muted)" />
                        <span>{new Date(cust.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 'var(--font-weight-semibold)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                        }}
                      >
                        Verified Customer
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            No customers found matching search "{search}".
          </p>
        )}
      </div>
    </div>
  );
};

export default CustomerManagementTab;
