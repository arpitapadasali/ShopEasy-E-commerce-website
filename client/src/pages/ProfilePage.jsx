import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, ShieldCheck, Mail, Phone, MapPin, KeyRound, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const ProfilePage = () => {
  const { user, updateProfile, logout, isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    pinCode: user?.pinCode || '',
    password: '',
    newPassword: '',
    newPasswordConfirm: '',
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Prepare payload
    const payload = {
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      pinCode: formData.pinCode,
    };

    if (formData.newPassword) {
      if (!formData.password) {
        setErrorMsg('Current password is required to change password.');
        setIsUpdating(false);
        return;
      }
      if (formData.newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters.');
        setIsUpdating(false);
        return;
      }
      if (formData.newPassword !== formData.newPasswordConfirm) {
        setErrorMsg('New passwords do not match.');
        setIsUpdating(false);
        return;
      }
      payload.password = formData.password;
      payload.newPassword = formData.newPassword;
    }

    const res = await updateProfile(payload);
    setIsUpdating(false);

    if (res.success) {
      setSuccessMsg('Your profile has been updated successfully.');
      setFormData((prev) => ({
        ...prev,
        password: '',
        newPassword: '',
        newPasswordConfirm: '',
      }));
    } else {
      setErrorMsg(res.message || 'Failed to update profile.');
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* User Header Card */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-primary)',
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
                {user?.name}
              </h1>
              <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-success'}`}>
                {isAdmin ? 'Administrator' : 'Customer'}
              </span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {user?.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {isAdmin && (
            <Link to="/admin" className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)' }}>
              <ShieldCheck size={14} />
              Admin Panel
            </Link>
          )}
          <button onClick={logout} className="btn btn-outline" style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="card">
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
          Account Settings & Shipping Details
        </h2>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--font-size-sm)',
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            backgroundColor: '#f0fdf4',
            color: '#166534',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--font-size-sm)',
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Email (Read-Only)
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#f1f5f9',
                  color: 'var(--color-text-secondary)',
                  cursor: 'not-allowed',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 9876543210"
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Bengaluru"
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                PIN / Postal Code
              </label>
              <input
                type="text"
                name="pinCode"
                value={formData.pinCode}
                onChange={handleChange}
                placeholder="560001"
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              Street Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              placeholder="Apartment, Street name, Landmark"
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>

          {/* Change Password Section */}
          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
              Change Password (Leave blank to keep current)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-1)' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-1)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-1)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="newPasswordConfirm"
                  value={formData.newPasswordConfirm}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <button
              type="submit"
              disabled={isUpdating}
              className="btn btn-primary"
              style={{ minWidth: '160px' }}
            >
              {isUpdating ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
