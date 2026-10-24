import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { adminService } from '../../services/api.js';

export const ReviewManagementTab = () => {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const fetchReviews = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (ratingFilter !== 'all') params.rating = Number(ratingFilter);
      if (search.trim()) params.search = search.trim();

      const data = await adminService.getReviews(params);
      if (data.success) {
        setReviews(data.reviews || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data.message || 'Failed to load reviews.');
      }
    } catch (err) {
      console.error('[ReviewManagementTab] Fetch error:', err);
      setError(err.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, ratingFilter, search]);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  const handleModerate = async (reviewId, newStatus) => {
    setActionLoadingId(reviewId);
    try {
      const res = await adminService.moderateReview(reviewId, newStatus);
      if (res.success) {
        showSuccess(`Review marked as ${newStatus}.`);
        // Update locally
        setReviews((prev) =>
          prev.map((r) => (r._id === reviewId ? { ...r, status: newStatus } : r))
        );
      } else {
        setError(res.message || 'Failed to update review status.');
      }
    } catch (err) {
      setError(err.message || 'Failed to update review status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;

    setActionLoadingId(reviewId);
    try {
      const res = await adminService.deleteReview(reviewId);
      if (res.success) {
        showSuccess('Review permanently deleted.');
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      } else {
        setError(res.message || 'Failed to delete review.');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete review.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Control Header & Filters */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Star size={20} color="var(--color-primary)" />
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                Product Reviews & Moderation ({pagination.total})
              </h2>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Inspect, moderate, approve, reject, or remove customer product ratings and reviews.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchReviews(pagination.page)}
            disabled={loading}
            className="btn btn-outline"
            style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search product, author, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '32px',
                paddingRight: '12px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: 'var(--font-size-xs)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: 'var(--font-size-xs)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Star Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Rating:</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: 'var(--font-size-xs)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <option value="all">All Stars</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Reviews Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-xs)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-semibold)' }}>Product</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-semibold)' }}>Reviewer</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-semibold)' }}>Rating</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-semibold)' }}>Review Content</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-semibold)' }}>Status</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-semibold)' }}>Date</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-semibold)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto var(--space-2)', color: 'var(--color-primary)' }} />
                    <p style={{ color: 'var(--color-text-secondary)' }}>Loading customer reviews...</p>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)' }}>
                    No reviews found matching the selected filters.
                  </td>
                </tr>
              ) : (
                reviews.map((r) => {
                  const isProcessing = actionLoadingId === r._id;
                  const productName = r.product?.name || 'Deleted Product';
                  const reviewerName = r.user?.name || 'Anonymous';
                  const reviewerEmail = r.user?.email || '';

                  return (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                      {/* Product */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', maxWidth: '180px' }}>
                        <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)' }}>
                          {productName}
                        </div>
                        {r.product?.brand && (
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                            {r.product.brand}
                          </div>
                        )}
                      </td>

                      {/* Reviewer */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', maxWidth: '160px' }}>
                        <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-secondary)' }}>
                          {reviewerName}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                          {reviewerEmail}
                        </div>
                        {r.isVerifiedPurchase && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '0.65rem',
                              color: '#15803d',
                              fontWeight: 'var(--font-weight-bold)',
                              marginTop: '2px',
                            }}
                          >
                            <ShieldCheck size={11} /> Verified Buyer
                          </span>
                        )}
                      </td>

                      {/* Rating */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={13}
                              fill={star <= r.rating ? '#eab308' : '#e2e8f0'}
                              color={star <= r.rating ? '#eab308' : '#cbd5e1'}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'inline-block' }}>
                          {r.rating} of 5
                        </span>
                      </td>

                      {/* Review Content */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', maxWidth: '320px' }}>
                        <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)', marginBottom: '2px' }}>
                          {r.title}
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: 0, wordBreak: 'break-word' }}>
                          {r.comment}
                        </p>
                      </td>

                      {/* Status */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor:
                              r.status === 'approved'
                                ? '#dcfce7'
                                : r.status === 'rejected'
                                ? '#fee2e2'
                                : '#fef3c7',
                            color:
                              r.status === 'approved'
                                ? '#15803d'
                                : r.status === 'rejected'
                                ? '#b91c1c'
                                : '#b45309',
                          }}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                        {new Date(r.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          {r.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleModerate(r._id, 'approved')}
                              disabled={isProcessing}
                              className="btn btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#16a34a', borderColor: '#86efac' }}
                              title="Approve Review"
                            >
                              <CheckCircle2 size={13} />
                              <span>Approve</span>
                            </button>
                          )}

                          {r.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleModerate(r._id, 'rejected')}
                              disabled={isProcessing}
                              className="btn btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#b45309', borderColor: '#fde68a' }}
                              title="Reject Review"
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(r._id)}
                            disabled={isProcessing}
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#dc2626', borderColor: '#fca5a5' }}
                            title="Permanently Delete Review"
                          >
                            <Trash2 size={13} />
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

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-bg-secondary)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Page {pagination.page} of {pagination.pages} ({pagination.total} reviews total)
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => fetchReviews(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => fetchReviews(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages || loading}
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewManagementTab;
