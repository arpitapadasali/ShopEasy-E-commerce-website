import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  X,
  Star,
  Check,
  Upload,
  Download,
  FileText,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { adminService, productService } from '../../services/api.js';
import { formatINR } from '../../utils/formatters.js';

export const ProductManagementTab = ({ onProductChanged }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states: Create / Edit / Delete
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Bulk Import CSV Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    brand: '',
    description: '',
    category: '',
    priceINR: '',
    discount: '0',
    stock: '',
    imageUrl: '',
    isActive: true,
    featured: false,
  });
  const [formErrors, setFormErrors] = useState({});

  const fallbackImage =
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80';

  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const fetchCategories = async () => {
    try {
      const data = await adminService.getCategories();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('[ProductTab] Categories fetch error:', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.category = selectedCategory;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (lowStockOnly) params.stockLt = 5;

      const data = await adminService.getProducts(params);
      if (data.success) {
        setProducts(data.products || []);
        setTotalPages(data.pages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('[ProductTab] Fetch products error:', err);
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory, statusFilter, lowStockOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      brand: '',
      description: '',
      category: categories.length > 0 ? categories[0]._id : '',
      priceINR: '',
      discount: '0',
      stock: '15',
      imageUrl: '',
      isActive: true,
      featured: false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      brand: product.brand || '',
      description: product.description,
      category: product.category?._id || product.category || '',
      priceINR: (product.price / 100).toFixed(2),
      discount: (product.discount || 0).toString(),
      stock: product.stock.toString(),
      imageUrl: product.imageUrl || '',
      isActive: product.isActive !== undefined ? product.isActive : true,
      featured: product.featured || false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Product name is required (min 2 characters).';
    }
    if (!formData.description || formData.description.trim().length === 0) {
      errors.description = 'Product description is required.';
    }
    if (!formData.category) {
      errors.category = 'Category selection is required.';
    }
    const parsedPrice = parseFloat(formData.priceINR);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      errors.priceINR = 'Valid price in INR is required (must be >= 0).';
    }
    const parsedDiscount = parseFloat(formData.discount);
    if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
      errors.discount = 'Discount must be between 0% and 100%.';
    }
    const parsedStock = parseInt(formData.stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      errors.stock = 'Valid stock count is required (must be >= 0).';
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
        sku: formData.sku.trim(),
        brand: formData.brand.trim(),
        description: formData.description.trim(),
        category: formData.category,
        price: Math.round(parseFloat(formData.priceINR) * 100), // convert to integer paise
        discount: Math.max(0, Math.min(100, parseFloat(formData.discount) || 0)),
        stock: parseInt(formData.stock, 10),
        imageUrl: formData.imageUrl.trim(),
        isActive: Boolean(formData.isActive),
        featured: Boolean(formData.featured),
      };

      if (modalMode === 'create') {
        const res = await productService.createProduct(payload);
        if (res.success) {
          showNotification(`Product "${payload.name}" created successfully!`);
          setIsModalOpen(false);
          fetchProducts();
          if (onProductChanged) onProductChanged();
        }
      } else {
        const res = await productService.updateProduct(editingProduct._id, payload);
        if (res.success) {
          showNotification(`Product "${payload.name}" updated successfully!`);
          setIsModalOpen(false);
          fetchProducts();
          if (onProductChanged) onProductChanged();
        }
      }
    } catch (err) {
      console.error('[ProductTab] Submit error:', err);
      setFormErrors({ submit: err.response?.data?.message || err.message || 'Operation failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (product) => {
    try {
      const newStatus = !product.isActive;
      await productService.updateProduct(product._id, { isActive: newStatus });
      showNotification(`Product "${product.name}" marked as ${newStatus ? 'Active' : 'Inactive'}.`);
      fetchProducts();
      if (onProductChanged) onProductChanged();
    } catch (err) {
      showNotification(err.message || 'Failed to toggle product status.', 'error');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteConfirmation) return;
    setSubmitting(true);
    try {
      await productService.deleteProduct(deleteConfirmation._id);
      showNotification(`Product "${deleteConfirmation.name}" deleted successfully.`);
      setDeleteConfirmation(null);
      fetchProducts();
      if (onProductChanged) onProductChanged();
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Delete failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Sample CSV Download
  const handleDownloadSampleCSV = async () => {
    try {
      const blob = await adminService.downloadSampleCSV();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'shopeasy_products_template.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showNotification('Sample CSV template downloaded successfully!');
    } catch (err) {
      showNotification(err.message || 'Failed to download sample CSV.', 'error');
    }
  };

  // File Upload handling
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setImportCsvText(text);

      // Extract preview rows
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      setImportPreviewRows(lines.slice(0, 5));
    };
    reader.readAsText(file);
  };

  // Execute Bulk Import
  const handleExecuteImport = async () => {
    if (!importCsvText.trim()) {
      showNotification('Please select or paste valid CSV content.', 'error');
      return;
    }

    setImporting(true);
    try {
      const res = await adminService.importProductsCSV(importCsvText);
      if (res.success) {
        setImportSummary(res.summary);
        showNotification(res.message);
        fetchProducts();
        if (onProductChanged) onProductChanged();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Bulk import failed.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setImportCsvText('');
    setImportFileName('');
    setImportPreviewRows([]);
    setImportSummary(null);
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

      {/* Control Bar: Search, Category Filter, Status, and Action Buttons */}
      <div className="card" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
              Product Inventory Management ({totalCount})
            </h2>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Add, edit, bulk import via CSV, manage SKUs/stock, and safely activate/deactivate products
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {/* Download Sample CSV */}
            <button
              type="button"
              onClick={handleDownloadSampleCSV}
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-1)', padding: 'var(--space-2) var(--space-3)' }}
              title="Download sample CSV template"
            >
              <Download size={14} />
              <span>Sample CSV</span>
            </button>

            {/* Bulk Import CSV Button */}
            <button
              type="button"
              onClick={() => {
                setIsImportModalOpen(true);
                setImportSummary(null);
              }}
              className="btn btn-outline"
              style={{
                fontSize: 'var(--font-size-xs)',
                gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-3)',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                borderColor: '#bfdbfe',
              }}
            >
              <Upload size={14} />
              <span>Bulk Import CSV</span>
            </button>

            {/* Add Product Button */}
            <button
              type="button"
              onClick={openCreateModal}
              className="btn btn-primary"
              style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-1)', padding: 'var(--space-2) var(--space-4)' }}
            >
              <Plus size={16} />
              <span>Add Product</span>
            </button>

            {/* Refresh list button */}
            <button
              type="button"
              onClick={fetchProducts}
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2)' }}
              title="Refresh list"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: '1 1 240px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search by name, SKU, brand, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) 2rem var(--space-2) var(--space-8)',
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
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  title="Clear search"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-2) var(--space-3)' }}>
              Search
            </button>
          </form>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-xs)',
              minWidth: '160px',
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Low Stock Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setLowStockOnly(!lowStockOnly);
              setPage(1);
            }}
            className={`btn ${lowStockOnly ? 'btn-primary' : 'btn-outline'}`}
            style={{
              fontSize: 'var(--font-size-xs)',
              padding: 'var(--space-2) var(--space-3)',
              gap: 'var(--space-1)',
              backgroundColor: lowStockOnly ? '#b45309' : undefined,
              borderColor: lowStockOnly ? '#b45309' : undefined,
            }}
          >
            <AlertTriangle size={14} />
            <span>≤ 5 Stock Alert</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Loading products from MongoDB...
          </p>
        ) : error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: '#b91c1c' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto var(--space-2)' }} />
            <p>{error}</p>
          </div>
        ) : products.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: 'var(--space-3)' }}>Product & SKU</th>
                  <th style={{ padding: 'var(--space-3)' }}>Category & Brand</th>
                  <th style={{ padding: 'var(--space-3)' }}>Price & Discount</th>
                  <th style={{ padding: 'var(--space-3)' }}>Stock Level</th>
                  <th style={{ padding: 'var(--space-3)' }}>Status</th>
                  <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isLowStock = p.stock <= 5;
                  const isOutOfStock = p.stock <= 0;
                  const hasDiscount = Boolean(p.discount && p.discount > 0);
                  const effectivePrice = hasDiscount
                    ? Math.round(p.price * (1 - p.discount / 100))
                    : p.price;

                  return (
                    <tr
                      key={p._id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: isLowStock ? '#fffbeb' : undefined,
                      }}
                    >
                      {/* Product Thumbnail, SKU & Name */}
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <img
                            src={p.imageUrl || fallbackImage}
                            alt={p.name}
                            style={{
                              width: '46px',
                              height: '46px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border)',
                            }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = fallbackImage;
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-secondary)' }}>
                              {p.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '2px', flexWrap: 'wrap' }}>
                              {p.sku && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 'var(--font-weight-bold)',
                                    fontFamily: 'monospace',
                                    color: '#1e40af',
                                    backgroundColor: '#dbeafe',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  SKU: {p.sku}
                                </span>
                              )}
                              {p.featured && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    fontSize: '0.65rem',
                                    fontWeight: 'var(--font-weight-bold)',
                                    color: '#ca8a04',
                                    backgroundColor: '#fef9c3',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <Star size={10} fill="#ca8a04" /> Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-secondary)' }}>
                          {p.category?.name || 'Unassigned'}
                        </div>
                        {p.brand && (
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Brand: {p.brand}
                          </div>
                        )}
                      </td>

                      {/* Price & Discount */}
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                          {formatINR(effectivePrice)}
                        </div>
                        {hasDiscount && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                              {formatINR(p.price)}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 'var(--font-weight-bold)', backgroundColor: '#fee2e2', padding: '0 4px', borderRadius: '2px' }}>
                              -{p.discount}%
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Stock Level with Highlight for <= 5 */}
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'var(--font-weight-bold)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: isOutOfStock ? '#fee2e2' : isLowStock ? '#fef3c7' : '#f0fdf4',
                            color: isOutOfStock ? '#b91c1c' : isLowStock ? '#b45309' : '#16a34a',
                            border: `1px solid ${isOutOfStock ? '#fca5a5' : isLowStock ? '#fde68a' : '#bbf7d0'}`,
                          }}
                        >
                          {isLowStock && <AlertTriangle size={12} />}
                          {isOutOfStock ? '0 (Out of stock)' : `${p.stock} units`}
                        </span>
                      </td>

                      {/* Active / Inactive Status */}
                      <td style={{ padding: 'var(--space-3)' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          title={`Click to ${p.isActive ? 'deactivate' : 'activate'}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: p.isActive ? '#16a34a' : '#64748b',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: p.isActive ? '#f0fdf4' : '#f1f5f9',
                          }}
                        >
                          {p.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          <span>{p.isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="btn btn-outline"
                            style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-size-xs)' }}
                            title="Edit Product"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmation(p)}
                            className="btn btn-outline"
                            style={{
                              padding: 'var(--space-1) var(--space-2)',
                              fontSize: 'var(--font-size-xs)',
                              color: '#b91c1c',
                              borderColor: '#fca5a5',
                            }}
                            title="Delete Product"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            No products found matching your search or filters.
          </p>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)', backgroundColor: '#fafafa' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Page {page} of {totalPages} ({totalCount} total items)
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="btn btn-outline"
                style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-3)' }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="btn btn-outline"
                style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-3)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* BULK CSV IMPORT MODAL */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 'var(--space-6)',
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Upload size={20} color="var(--color-primary)" />
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                  Bulk Product Import (CSV)
                </h3>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Download Template Prompt */}
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                marginBottom: 'var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
              }}
            >
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                <strong>Required CSV Headers:</strong> name, description, price, category, brand, imageUrl, stock, discount, featured, sku
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="btn btn-outline"
                style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-1)', padding: 'var(--space-1) var(--space-3)' }}
              >
                <Download size={13} />
                <span>Get Template</span>
              </button>
            </div>

            {/* Import Results Box if finished */}
            {importSummary && (
              <div
                style={{
                  marginBottom: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: importSummary.failedCount > 0 ? '#fffbeb' : '#f0fdf4',
                  border: `1px solid ${importSummary.failedCount > 0 ? '#fde68a' : '#bbf7d0'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  {importSummary.failedCount === 0 ? (
                    <CheckCircle2 size={18} color="#16a34a" />
                  ) : (
                    <AlertCircle size={18} color="#b45309" />
                  )}
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)' }}>
                    Import Summary
                  </h4>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-3)' }}>
                  <span>Total Rows: <strong>{importSummary.totalRows}</strong></span>
                  <span style={{ color: '#16a34a' }}>Imported: <strong>{importSummary.importedCount}</strong></span>
                  <span style={{ color: importSummary.failedCount > 0 ? '#b91c1c' : 'inherit' }}>
                    Failed / Skipped: <strong>{importSummary.failedCount}</strong>
                  </span>
                </div>

                {/* Error log details */}
                {importSummary.errors && importSummary.errors.length > 0 && (
                  <div style={{ maxHeight: '160px', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #fed7aa', padding: 'var(--space-2)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 'var(--font-weight-bold)', color: '#b45309', marginBottom: '4px' }}>
                      Failed Rows Log:
                    </div>
                    {importSummary.errors.map((err, idx) => (
                      <div key={idx} style={{ fontSize: '0.7rem', color: '#991b1b', padding: '2px 0', borderBottom: '1px dashed #fee2e2' }}>
                        <strong>Row {err.row}:</strong> {err.name ? `"${err.name}" — ` : ''}{err.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* File Dropzone & Paste Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  style={{
                    width: '100%',
                    padding: 'var(--space-3)',
                    border: '2px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#fafafa',
                    fontSize: 'var(--font-size-xs)',
                    cursor: 'pointer',
                  }}
                />
                {importFileName && (
                  <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.7rem', color: '#16a34a', fontWeight: 'var(--font-weight-semibold)' }}>
                    Selected: {importFileName}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                  Or Paste CSV Data Directly
                </label>
                <textarea
                  rows="6"
                  placeholder="name,description,price,category,brand,imageUrl,stock,discount,featured,sku..."
                  value={importCsvText}
                  onChange={(e) => {
                    setImportCsvText(e.target.value);
                    const lines = e.target.value.split(/\r?\n/).filter((l) => l.trim().length > 0);
                    setImportPreviewRows(lines.slice(0, 5));
                  }}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-xs)',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              {/* Preview Box */}
              {importPreviewRows.length > 0 && (
                <div style={{ backgroundColor: '#f8fafc', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Data Preview (First {importPreviewRows.length} lines):
                  </span>
                  <pre style={{ margin: 0, fontSize: '0.65rem', overflowX: 'auto', color: 'var(--color-text-primary)' }}>
                    {importPreviewRows.join('\n')}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="btn btn-outline"
                  style={{ fontSize: 'var(--font-size-sm)' }}
                >
                  {importSummary ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importing || !importCsvText.trim()}
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--font-size-sm)', gap: 'var(--space-2)' }}
                >
                  {importing && <RefreshCw size={14} className="spin" />}
                  <span>{importing ? 'Processing CSV...' : 'Start Import'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CREATE / EDIT PRODUCT MODAL */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'var(--space-6)',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                {modalMode === 'create' ? 'Add New Product' : `Edit: ${editingProduct?.name}`}
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
              {/* Product Name */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AcousticPro Wireless Noise-Cancelling Headphones"
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

              {/* SKU & Brand */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                    SKU (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. SE-ELC-001 (auto-generated if empty)"
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                      fontFamily: 'monospace',
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Unique stock keeping unit</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. SoundPulse, Nike, Apple"
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

              {/* Category, Price INR, and Discount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${formErrors.category ? '#ef4444' : 'var(--color-border)'}`,
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>{formErrors.category}</span>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                    Price in INR (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 4999.00"
                    value={formData.priceINR}
                    onChange={(e) => setFormData({ ...formData, priceINR: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${formErrors.priceINR ? '#ef4444' : 'var(--color-border)'}`,
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                  {formErrors.priceINR && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>{formErrors.priceINR}</span>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="e.g. 15"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${formErrors.discount ? '#ef4444' : 'var(--color-border)'}`,
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                  {formErrors.discount && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>{formErrors.discount}</span>}
                </div>
              </div>

              {/* Stock count and Flags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                    Inventory Stock Units *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 25"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${formErrors.stock ? '#ef4444' : 'var(--color-border)'}`,
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                  {formErrors.stock && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>{formErrors.stock}</span>}
                </div>

                {/* Checkboxes: Active & Featured */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-2)', paddingTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Product is Active (Visible in Store)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    />
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Featured on Homepage</span>
                  </label>
                </div>
              </div>

              {/* Image URL with preview */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                  Image URL
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
                <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <img
                    src={formData.imageUrl || fallbackImage}
                    alt="Preview"
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = fallbackImage;
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Image preview (fallback applied if invalid)</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', marginBottom: '4px' }}>
                  Description *
                </label>
                <textarea
                  rows="3"
                  placeholder="Full specifications, key features and warranty..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${formErrors.description ? '#ef4444' : 'var(--color-border)'}`,
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'inherit',
                  }}
                />
                {formErrors.description && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>{formErrors.description}</span>}
              </div>

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
                  <span>{modalMode === 'create' ? 'Create Product' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================= */}
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
              maxWidth: '480px',
              padding: 'var(--space-6)',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: '#b91c1c', marginBottom: 'var(--space-3)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)' }}>
                Confirm Product Deletion
              </h3>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to permanently delete <strong>{deleteConfirmation.name}</strong>
              {deleteConfirmation.sku ? ` (SKU: ${deleteConfirmation.sku})` : ''}? Existing customer orders will preserve their historical item snapshots, but the product will be removed from the store catalog.
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
                onClick={handleDeleteProduct}
                disabled={submitting}
                className="btn btn-primary"
                style={{ fontSize: 'var(--font-size-xs)', backgroundColor: '#b91c1c', borderColor: '#b91c1c' }}
              >
                {submitting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagementTab;
