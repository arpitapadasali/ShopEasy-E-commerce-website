import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError, isAuthenticated, user, isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Determine destination after login or if already authenticated
  const getDestination = (targetUser) => {
    const role = targetUser?.role || user?.role;
    const requestedFrom = location.state?.from?.pathname;

    if (requestedFrom && requestedFrom !== '/login' && requestedFrom !== '/register') {
      if (requestedFrom.startsWith('/admin') && role !== 'admin') {
        return '/';
      }
      return requestedFrom;
    }

    return role === 'admin' ? '/admin' : '/';
  };

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      navigate(getDestination(user), { replace: true });
    }
  }, [isAuthenticated, isSubmitting, user]);

  const validate = () => {
    const errors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
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

    const res = await login(formData.email, formData.password);
    setIsSubmitting(false);

    if (res.success) {
      const target = getDestination(res.user);
      setSuccessMsg(`Welcome back, ${res.user.name}! Redirecting...`);
      setTimeout(() => {
        navigate(target, { replace: true });
      }, 600);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: 'var(--space-8) auto' }}>
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
            <LogIn size={24} color="var(--color-primary)" />
          </div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Sign In to ShopEasy
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
            Enter your credentials to access your account
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
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
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

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              Password
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: 'var(--space-3)', marginTop: 'var(--space-2)' }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ fontWeight: 'var(--font-weight-semibold)' }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
