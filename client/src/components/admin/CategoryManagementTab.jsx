import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { adminService, categoryService } from '../../services/api.js';

export const CategoryManagementTab = ({ onCategoryChanged }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /api/admin/categories returns categories with calculated productCount
      const data = await adminService.getCategories();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('[CategoryTab] Fetch categories error:', err);
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setModalMode('edit');
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      isActive: category.isActive !== undefined ? category.isActive : true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Category name is required (minimum 2 characters).';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim(),
        isActive: Boolean(formData.isActive),
      };

      if (modalMode === 'create') {
        const res = await categoryService.createCategory(payload);
        if (res.success) {
          showNotification(`Category "${payload.name}" created successfully!`);
          setIsModalOpen(false);
          fetchCategories();
          if (onCategoryChanged) onCategoryChanged();
        }
      } else {
        const res = await categoryService.updateCategory(editingCategory._id, payload);
        if (res.success) {
          showNotification(`Category "${payload.name}" updated successfully!`);
          setIsModalOpen(false);
          fetchCategories();
          if (onCategoryChanged) onCategoryChanged();
        }
      }
    } catch (err) {
      console.error('[CategoryTab] Submit error:', err);
      setFormErrors({ submit: err.response?.data?.message || err.message || 'Category action failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (category) => {
    try {
      const newStatus = !category.isActive;
      await categoryService.updateCategory(category._id, { isActive: newStatus });
      showNotification(`Category "${category.name}" marked as ${newStatus ? 'Active' : 'Inactive'}.`);
      fetchCategories();
      if (onCategoryChanged) onCategoryChanged();
    } catch (err) {
      showNotification(err.message || 'Failed to update category status.', 'error');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirmation) return;

    // Safety guard: prevent deleting if products are assigned
    if (deleteConfirmation.productCount > 0) {
      showNotification(
        `Cannot delete "${deleteConfirmation.name}": ${deleteConfirmation.productCount} product(s) are assigned to it. Reassign or delete these products first.`,
        'error'
      );
      setDeleteConfirmation(null);
      return;
    }

    setSubmitting(true);
    try {
      await categoryService.deleteCategory(deleteConfirmation._id);
      showNotification(`Category "${deleteConfirmation.name}" deleted successfully.`);
      setDeleteConfirmation(null);
      fetchCategories();
      if (onCategoryChanged) onCategoryChanged();
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Category deletion failed.', 'error');
    } finally {
      setSubmitting(false);
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

      {/* Control Header */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
              Category Taxonomy Management ({categories.length})
            </h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Maintain catalog organization, slugs, and prevent orphaned product references
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={openCreateModal}
              className="btn btn-primary"
              style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-1)', padding: 'var(--space-2) var(--space-4)' }}
            >
              <Plus size={16} />
              <span>Add Category</span>
            </button>
            <button
              type="button"
              onClick={fetchCategories}
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2)' }}
              title="Refresh list"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Loading categories from MongoDB...
          </p>
        ) : error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: '#b91c1c' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto var(--space-2)' }} />
            <p>{error}</p>
          </div>
        ) : categories.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: 'var(--space-3)' }}>Category</th>
                  <th style={{ padding: 'var(--space-3)' }}>Slug</th>
                  <th style={{ padding: 'var(--space-3)' }}>Description</th>
                  <th style={{ padding: 'var(--space-3)' }}>Assigned Products</th>
                  <th style={{ padding: 'var(--space-3)' }}>Status</th>
                  <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {/* Thumbnail & Name */}
                    <td style={{ padding: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <img
                          src={cat.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=80&auto=format&fit=crop&q=80'}
                          alt={cat.name}
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        />
                        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)' }}>
                          {cat.name}
                        </span>
                      </div>
                    </td>

                    {/* Slug */}
                    <td style={{ padding: 'var(--space-3)', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {cat.slug}
                    </td>

                    {/* Description */}
                    <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cat.description || '—'}
                    </td>

                    {/* Assigned Products with Safe count badge */}
                    <td style={{ padding: 'var(--space-3)' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'var(--font-weight-semibold)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: cat.productCount > 0 ? '#eff6ff' : '#f1f5f9',
                          color: cat.productCount > 0 ? '#1d4ed8' : '#64748b',
                        }}
                      >
                        <Package size={12} />
                        {cat.productCount} {cat.productCount === 1 ? 'product' : 'products'}
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td style={{ padding: 'var(--space-3)' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        title={`Click to ${cat.isActive ? 'deactivate' : 'activate'}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: cat.isActive ? '#16a34a' : '#64748b',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: cat.isActive ? '#f0fdf4' : '#f1f5f9',
                        }}
                      >
                        {cat.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        <span>{cat.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="btn btn-outline"
                          style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-size-xs)' }}
                          title="Edit Category"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmation(cat)}
                          className="btn btn-outline"
                          style={{
                            padding: 'var(--space-1) var(--space-2)',
                            fontSize: 'var(--font-size-xs)',
                            color: cat.productCount > 0 ? '#9ca3af' : '#b91c1c',
                            borderColor: cat.productCount > 0 ? '#e5e7eb' : '#fca5a5',
                          }}
                          title={cat.productCount > 0 ? 'Assigned products must be reassigned before deleting' : 'Delete Category'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            No categories registered. Click "Add Category" to create one.
          </p>
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isModalOpen && (
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
              maxWidth: '520px',
              padding: 'var(--space-6)',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                {modalMode === 'create' ? 'Add New Category' : `Edit Category: ${editingCategory?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formErrors.submit && (
              <div style={{ padding: 'var(--space-3)', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Category Name */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sports & Fitness"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${formErrors.name ? '#ef4444' : 'var(--color-border)'}`,
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
                {formErrors.name && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>{formErrors.name}</span>}
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Short description of this product line..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Image URL */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                  Banner / Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
              </div>

              {/* Active status */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Category is Active (Visible on Storefront)</span>
              </label>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline"
                  style={{ fontSize: 'var(--font-size-sm)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--font-size-sm)', gap: 'var(--space-2)' }}
                >
                  {submitting && <RefreshCw size={14} className="spin" />}
                  <span>{modalMode === 'create' ? 'Create Category' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG WITH REFERENTIAL INTEGRITY SAFETY CHECK */}
      {deleteConfirmation && (
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
              maxWidth: '500px',
              padding: 'var(--space-6)',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: '#b91c1c', marginBottom: 'var(--space-3)' }}>
              <ShieldAlert size={24} />
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)' }}>
                {deleteConfirmation.productCount > 0 ? 'Deletion Blocked by Safe Reference Rule' : 'Confirm Category Deletion'}
              </h3>
            </div>

            {deleteConfirmation.productCount > 0 ? (
              <div>
                <div style={{ padding: 'var(--space-3)', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: '#991b1b', lineHeight: '1.4' }}>
                    <strong>Safety Rule Active:</strong> Cannot delete <strong>{deleteConfirmation.name}</strong> because{' '}
                    <strong>{deleteConfirmation.productCount} product(s)</strong> are currently assigned to it.
                  </p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: '#991b1b', marginTop: '6px' }}>
                    To protect catalog referential integrity, please reassign or delete these products in the Product Management tab first.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmation(null)}
                    className="btn btn-outline"
                    style={{ fontSize: 'var(--font-size-xs)' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                  Are you sure you want to delete category <strong>{deleteConfirmation.name}</strong>? No products are currently assigned to this category, so it can be safely removed.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmation(null)}
                    className="btn btn-outline"
                    style={{ fontSize: 'var(--font-size-xs)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCategory}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ fontSize: 'var(--font-size-xs)', backgroundColor: '#b91c1c', borderColor: '#b91c1c' }}
                  >
                    {submitting ? 'Deleting...' : 'Delete Category'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagementTab;
