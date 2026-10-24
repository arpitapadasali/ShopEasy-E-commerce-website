import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Search,
  Calendar,
  Percent,
  Banknote,
  ShieldAlert,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { adminService } from '../../services/api.js';
import { formatINR } from '../../utils/formatters.js';

export const CouponManagementTab = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive' | 'expired'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields (Values displayed in Rupees for easy admin editing, converted to Paise on submit)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '10', // 10% or Rs 100
    minOrderAmount: '0', // Rs 0
    maxDiscountAmount: '', // Rs 0 or empty
    expiryDate: '',
    usageLimit: '',
    userUsageLimit: '1',
    firstOrderOnly: false,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const fetchCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getCoupons();
      if (data.success && Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
      }
    } catch (err) {
      console.error('[CouponTab] Fetch coupons error:', err);
      setError(err.message || 'Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingCoupon(null);
    // Default expiry 30 days from today
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const defaultExpiry = d.toISOString().split('T')[0];

    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '10',
      minOrderAmount: '0',
      maxDiscountAmount: '',
      expiryDate: defaultExpiry,
      usageLimit: '',
      userUsageLimit: '1',
      firstOrderOnly: false,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (coupon) => {
    setModalMode('edit');
    setEditingCoupon(coupon);

    const expiryFormatted = coupon.expiryDate
      ? new Date(coupon.expiryDate).toISOString().split('T')[0]
      : '';

    // Convert fixed amount from paise to rupees for form input
    const displayDiscountValue =
      coupon.discountType === 'fixed'
        ? (coupon.discountValue / 100).toString()
        : coupon.discountValue.toString();

    const displayMinOrder =
      coupon.minOrderAmount ? (coupon.minOrderAmount / 100).toString() : '0';

    const displayMaxDiscount =
      coupon.maxDiscountAmount ? (coupon.maxDiscountAmount / 100).toString() : '';

    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: displayDiscountValue,
      minOrderAmount: displayMinOrder,
      maxDiscountAmount: displayMaxDiscount,
      expiryDate: expiryFormatted,
      usageLimit: coupon.usageLimit !== null && coupon.usageLimit !== undefined ? coupon.usageLimit.toString() : '',
      userUsageLimit: coupon.userUsageLimit ? coupon.userUsageLimit.toString() : '1',
      firstOrderOnly: Boolean(coupon.firstOrderOnly),
      isActive: coupon.isActive !== undefined ? coupon.isActive : true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const code = (formData.code || '').trim().toUpperCase();
    if (!code || code.length < 3) {
      errors.code = 'Coupon code must be at least 3 characters.';
    } else if (!/^[A-Z0-9_-]+$/.test(code)) {
      errors.code = 'Code can only contain letters, numbers, hyphens, and underscores.';
    }

    const val = parseFloat(formData.discountValue);
    if (isNaN(val) || val <= 0) {
      errors.discountValue = 'Please enter a valid positive discount value.';
    } else if (formData.discountType === 'percentage' && (val < 1 || val > 100)) {
      errors.discountValue = 'Percentage discount must be between 1% and 100%.';
    }

    if (!formData.expiryDate) {
      errors.expiryDate = 'Please specify an expiry date.';
    } else {
      const selectedExpiry = new Date(formData.expiryDate);
      if (isNaN(selectedExpiry.getTime())) {
        errors.expiryDate = 'Invalid expiry date.';
      }
    }

    if (formData.usageLimit && (parseInt(formData.usageLimit, 10) <= 0 || isNaN(parseInt(formData.usageLimit, 10)))) {
      errors.usageLimit = 'Usage limit must be a positive number.';
    }

    if (formData.userUsageLimit && (parseInt(formData.userUsageLimit, 10) <= 0 || isNaN(parseInt(formData.userUsageLimit, 10)))) {
      errors.userUsageLimit = 'User usage limit must be at least 1.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const isPercentage = formData.discountType === 'percentage';
      const numVal = parseFloat(formData.discountValue);

      // Convert rupees to paise where required
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: isPercentage ? Math.round(numVal) : Math.round(numVal * 100),
        minOrderAmount: formData.minOrderAmount ? Math.round(parseFloat(formData.minOrderAmount) * 100) : 0,
        maxDiscountAmount:
          isPercentage && formData.maxDiscountAmount && parseFloat(formData.maxDiscountAmount) > 0
            ? Math.round(parseFloat(formData.maxDiscountAmount) * 100)
            : null,
        expiryDate: new Date(formData.expiryDate).toISOString(),
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
        userUsageLimit: formData.userUsageLimit ? parseInt(formData.userUsageLimit, 10) : 1,
        firstOrderOnly: Boolean(formData.firstOrderOnly),
        isActive: Boolean(formData.isActive),
      };

      if (modalMode === 'create') {
        const res = await adminService.createCoupon(payload);
        if (res.success) {
          showNotification(`Coupon "${payload.code}" created successfully!`);
          setIsModalOpen(false);
          fetchCoupons();
        }
      } else {
        const res = await adminService.updateCoupon(editingCoupon._id, payload);
        if (res.success) {
          showNotification(`Coupon "${payload.code}" updated successfully!`);
          setIsModalOpen(false);
          fetchCoupons();
        }
      }
    } catch (err) {
      console.error('[CouponTab] Submit error:', err);
      showNotification(err.message || 'Error saving coupon.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const res = await adminService.toggleCouponStatus(coupon._id);
      if (res.success) {
        showNotification(
          `Coupon "${coupon.code}" is now ${res.coupon.isActive ? 'active' : 'inactive'}.`
        );
        fetchCoupons();
      }
    } catch (err) {
      console.error('[CouponTab] Toggle error:', err);
      showNotification(err.message || 'Failed to toggle status.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) return;
    setSubmitting(true);
    try {
      const res = await adminService.deleteCoupon(deleteConfirmation._id);
      if (res.success) {
        showNotification(`Coupon "${deleteConfirmation.code}" deleted successfully.`);
        setDeleteConfirmation(null);
        fetchCoupons();
      }
    } catch (err) {
      console.error('[CouponTab] Delete error:', err);
      showNotification(err.message || 'Failed to delete coupon.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & Search logic
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (coupon.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isExpired = new Date(coupon.expiryDate) < new Date();

    if (!matchesSearch) return false;

    if (statusFilter === 'active') {
      return coupon.isActive && !isExpired;
    }
    if (statusFilter === 'inactive') {
      return !coupon.isActive;
    }
    if (statusFilter === 'expired') {
      return isExpired;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header and Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Tag size={22} color="var(--color-primary)" />
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
              Coupons & Promotional Discounts
            </h2>
          </div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Manage discount campaigns, minimum order thresholds, usage limits, and customer eligibility
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={fetchCoupons}
            disabled={loading}
            className="btn btn-outline"
            style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
          >
            <Plus size={16} />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          backgroundColor: notification.type === 'error' ? '#fee2e2' : '#f0fdf4',
          color: notification.type === 'error' ? '#b91c1c' : '#166534',
          border: `1px solid ${notification.type === 'error' ? '#fca5a5' : '#bbf7d0'}`,
        }}>
          {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search coupon code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3) var(--space-2) 34px',
              fontSize: 'var(--font-size-sm)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
            Filter:
          </span>
          {['all', 'active', 'inactive', 'expired'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: '4px 10px',
                borderRadius: '14px',
                border: '1px solid',
                borderColor: statusFilter === filter ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: statusFilter === filter ? 'var(--color-primary)' : 'transparent',
                color: statusFilter === filter ? '#ffffff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontWeight: statusFilter === filter ? 'var(--font-weight-semibold)' : 'normal',
                textTransform: 'capitalize',
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Coupon Code</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Discount</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Thresholds</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Redemptions</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Expiry</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Status</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    {loading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                        <RefreshCw size={16} className="spin" />
                        <span>Loading promotional coupons...</span>
                      </div>
                    ) : (
                      <div>
                        <Tag size={32} style={{ margin: '0 auto var(--space-2)', color: 'var(--color-text-muted)' }} />
                        <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>No coupons found</div>
                        <div style={{ fontSize: 'var(--font-size-xs)' }}>Try clearing your filters or create a new discount campaign.</div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => {
                  const isExpired = new Date(coupon.expiryDate) < new Date();
                  const remaining =
                    coupon.usageLimit !== null && coupon.usageLimit !== undefined
                      ? Math.max(0, coupon.usageLimit - (coupon.usedCount || 0))
                      : 'Unlimited';

                  return (
                    <tr
                      key={coupon._id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: !coupon.isActive || isExpired ? 'rgba(248, 250, 252, 0.6)' : 'transparent',
                      }}
                    >
                      {/* Code & Description */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 'var(--font-weight-bold)',
                            color: coupon.isActive && !isExpired ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            backgroundColor: 'var(--color-bg-secondary)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px dashed var(--color-border)',
                          }}>
                            {coupon.code}
                          </span>
                          {coupon.firstOrderOnly && (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              fontWeight: 'var(--font-weight-semibold)',
                            }}>
                              1st Order
                            </span>
                          )}
                        </div>
                        {coupon.description && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '4px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {coupon.description}
                          </div>
                        )}
                      </td>

                      {/* Discount Value */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                          {coupon.discountType === 'percentage'
                            ? `${coupon.discountValue}% OFF`
                            : `${formatINR(coupon.discountValue)} OFF`}
                        </div>
                        {coupon.discountType === 'percentage' && coupon.maxDiscountAmount ? (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            Capped at {formatINR(coupon.maxDiscountAmount)}
                          </div>
                        ) : null}
                      </td>

                      {/* Thresholds */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-xs)' }}>
                        <div>
                          Min Order:{' '}
                          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                            {coupon.minOrderAmount > 0 ? formatINR(coupon.minOrderAmount) : 'None'}
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          Limit/user: {coupon.userUsageLimit || 1}
                        </div>
                      </td>

                      {/* Redemptions */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-xs)' }}>
                        <div>
                          Used:{' '}
                          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                            {coupon.usedCount || 0}
                          </span>
                          {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' (No cap)'}
                        </div>
                        {coupon.usageLimit && (
                          <div style={{ color: remaining === 0 ? '#dc2626' : 'var(--color-text-muted)', marginTop: '2px' }}>
                            {remaining === 0 ? 'Exhausted' : `${remaining} left`}
                          </div>
                        )}
                      </td>

                      {/* Expiry */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-xs)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="var(--color-text-muted)" />
                          <span>{new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {isExpired && (
                          <span style={{ color: '#dc2626', fontWeight: 'var(--font-weight-medium)', fontSize: '0.68rem' }}>
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: coupon.isActive && !isExpired ? '#f0fdf4' : '#f1f5f9',
                            color: coupon.isActive && !isExpired ? '#166534' : 'var(--color-text-muted)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-semibold)',
                          }}
                          title="Click to toggle status"
                        >
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: coupon.isActive && !isExpired ? '#16a34a' : '#94a3b8',
                          }} />
                          <span>{coupon.isActive ? (isExpired ? 'Expired' : 'Active') : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(coupon)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', gap: '4px' }}
                            title="Edit Coupon"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmation(coupon)}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', color: '#dc2626', borderColor: '#fca5a5' }}
                            title="Delete Coupon"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 'var(--space-4)',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Tag size={20} color="var(--color-primary)" />
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                  {modalMode === 'create' ? 'Create Promotional Coupon' : `Edit Coupon: ${editingCoupon?.code}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Code */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                  Coupon Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SUMMER25"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={modalMode === 'edit'} // Code shouldn't change once issued
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${formErrors.code ? '#ef4444' : 'var(--color-border)'}`,
                  }}
                />
                {formErrors.code && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                    {formErrors.code}
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                  Description / Campaign Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. 15% discount on all electronics for Diwali festival"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
              </div>

              {/* Discount Type and Value Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                    Discount Type *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                      backgroundColor: 'transparent',
                    }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                    {formData.discountType === 'percentage' ? 'Percentage Value (%) *' : 'Amount in Rupees (₹) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formData.discountType === 'percentage' ? '100' : '1000000'}
                    placeholder={formData.discountType === 'percentage' ? '10' : '200'}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${formErrors.discountValue ? '#ef4444' : 'var(--color-border)'}`,
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                  {formErrors.discountValue && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {formErrors.discountValue}
                    </span>
                  )}
                </div>
              </div>

              {/* Min Order & Max Cap Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                    Min Order Subtotal (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = no minimum"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={formData.discountType === 'percentage' ? 'e.g. 500 (optional cap)' : 'N/A for fixed'}
                    disabled={formData.discountType !== 'percentage'}
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                      backgroundColor: formData.discountType !== 'percentage' ? 'var(--color-bg-secondary)' : 'transparent',
                    }}
                  />
                </div>
              </div>

              {/* Expiry Date & Usage Limit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${formErrors.expiryDate ? '#ef4444' : 'var(--color-border)'}`,
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                  {formErrors.expiryDate && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {formErrors.expiryDate}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                    Total Usage Limit (Overall)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>
              </div>

              {/* Per-user limit and checkboxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: '4px' }}>
                    Usage Limit Per Customer
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.userUsageLimit}
                    onChange={(e) => setFormData({ ...formData, userUsageLimit: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.firstOrderOnly}
                      onChange={(e) => setFormData({ ...formData, firstOrderOnly: e.target.checked })}
                    />
                    <span>First Order Only</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span>Active Immediately</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ gap: 'var(--space-2)' }}
                >
                  {submitting && <RefreshCw size={14} className="spin" />}
                  <span>{modalMode === 'create' ? 'Create Coupon' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 'var(--space-4)',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-6)', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}>
              <Trash2 size={28} />
            </div>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
              Delete Coupon?
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              Are you sure you want to permanently delete coupon{' '}
              <strong style={{ fontFamily: 'monospace', color: 'var(--color-secondary)' }}>
                {deleteConfirmation.code}
              </strong>
              ? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="btn btn-outline"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagementTab;
