import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle2, Lock, Mail, User, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, error, clearError, isAuthenticated, isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    city: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      navigate(isAdmin ? '/admin' : '/', { replace: true });
    }
  }, [isAuthenticated, isSubmitting, isAdmin, navigate]);

  const validate = () => {
    const errors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!formData.name.trim()) {
      errors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email format.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (!formData.passwordConfirm) {
      errors.passwordConfirm = 'Please confirm your password.';
    } else if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = 'Passwords do not match.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    clearError();
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: '',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSuccessMsg('');

    const res = await register(formData);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('Account registered successfully! Welcome to ShopEasy...');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 700);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: 'var(--space-8) auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-3)'
          }}>
            <UserPlus size={24} color="var(--color-primary)" />
          </div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Create Your Account
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
            Join ShopEasy to start ordering products seamlessly
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
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
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
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
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3) var(--space-2) 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${formErrors.name ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  outline: 'none',
                  fontSize: 'var(--font-size-sm)',
                }}
              />
              <User size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            {formErrors.name && (
              <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                {formErrors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              Email Address *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3) var(--space-2) 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${formErrors.email ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  outline: 'none',
                  fontSize: 'var(--font-size-sm)',
                }}
              />
              <Mail size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            {formErrors.email && (
              <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                {formErrors.email}
              </p>
            )}
          </div>

          {/* Passwords */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Password (min 6 chars) *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3) var(--space-2) 2.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${formErrors.password ? 'var(--color-danger)' : 'var(--color-border)'}`,
                    outline: 'none',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
                <Lock size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              {formErrors.password && (
                <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                  {formErrors.password}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Confirm Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3) var(--space-2) 2.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${formErrors.passwordConfirm ? 'var(--color-danger)' : 'var(--color-border)'}`,
                    outline: 'none',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
                <Lock size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              {formErrors.passwordConfirm && (
                <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                  {formErrors.passwordConfirm}
                </p>
              )}
            </div>
          </div>

          {/* Optional phone and city */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Phone Number (optional)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3) var(--space-2) 2.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    outline: 'none',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
                <Phone size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                City (optional)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Bengaluru"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3) var(--space-2) 2.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    outline: 'none',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
                <MapPin size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: 'var(--space-3)', marginTop: 'var(--space-2)' }}
          >
            {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 'var(--font-weight-semibold)' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
