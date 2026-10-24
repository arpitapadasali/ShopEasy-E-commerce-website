import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Layers,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Eye,
  Filter,
  Tag,
  Star,
} from 'lucide-react';
import { adminService } from '../services/api.js';
import { OrderStatusBadge } from '../components/orders/OrderStatusBadge.jsx';
import { formatINR } from '../utils/formatters.js';
import { ProductManagementTab } from '../components/admin/ProductManagementTab.jsx';
import { CategoryManagementTab } from '../components/admin/CategoryManagementTab.jsx';
import { OrderManagementTab } from '../components/admin/OrderManagementTab.jsx';
import { CustomerManagementTab } from '../components/admin/CustomerManagementTab.jsx';
import { CouponManagementTab } from '../components/admin/CouponManagementTab.jsx';
import { ReviewManagementTab } from '../components/admin/ReviewManagementTab.jsx';

export const AdminDashboardPage = () => {
  // Navigation active tab: 'overview' | 'products' | 'categories' | 'orders' | 'customers' | 'coupons'
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getStats();
      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        setError('Failed to fetch administrator analytics.');
      }
    } catch (err) {
      console.error('[AdminDashboard] Stats error:', err);
      setError(err.message || 'Access denied or server error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-8) 0', textAlign: 'center' }}>
        <RefreshCw size={32} className="spin" style={{ margin: '0 auto var(--space-4)', color: 'var(--color-primary)' }} />
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
          Loading Administrator Management Console...
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Aggregating live business intelligence and catalog data from MongoDB Atlas
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '600px', margin: 'var(--space-12) auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            color: '#b91c1c',
          }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            Admin Authorization Error
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
            {error}
          </p>
          <button type="button" onClick={fetchStats} className="btn btn-primary" style={{ margin: '0 auto' }}>
            <RefreshCw size={16} />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Calculate highest revenue day for chart scaling
  const maxDayRevenue = Math.max(1, ...(stats?.dailySales || []).map((d) => d.revenue));

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 'var(--space-4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
              ShopEasy Management Console
            </h1>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Live Administrator Control: Products, Categories, Orders, and Customers
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="btn btn-outline"
            style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Sync Stats</span>
          </button>
          <Link
            to="/"
            className="btn btn-outline"
            style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Live Storefront</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Responsive Admin Layout: Sidebar + Main Content */}
      <div className="admin-layout-grid" style={{ alignItems: 'start' }}>
        {/* Sidebar Navigation */}
        <aside>
          <div className="card" style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '0.7rem', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Management Console
            </div>

            {/* TAB: Overview */}
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                fontSize: 'var(--font-size-sm)',
                border: activeTab === 'overview' ? undefined : 'none',
              }}
            >
              <LayoutDashboard size={17} />
              <span>Dashboard Overview</span>
            </button>

            {/* TAB: Products */}
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                width: '100%',
                justifyContent: 'space-between',
                fontSize: 'var(--font-size-sm)',
                border: activeTab === 'products' ? undefined : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Package size={17} />
                <span>Products</span>
              </div>
              <span style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: activeTab === 'products' ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-secondary)',
                color: activeTab === 'products' ? '#ffffff' : 'var(--color-text-secondary)',
              }}>
                {stats?.totalProducts || 0}
              </span>
            </button>

            {/* TAB: Categories */}
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                fontSize: 'var(--font-size-sm)',
                border: activeTab === 'categories' ? undefined : 'none',
              }}
            >
              <Layers size={17} />
              <span>Categories</span>
            </button>

            {/* TAB: Orders */}
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                width: '100%',
                justifyContent: 'space-between',
                fontSize: 'var(--font-size-sm)',
                border: activeTab === 'orders' ? undefined : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <ShoppingBag size={17} />
                <span>Customer Orders</span>
              </div>
              <span style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: activeTab === 'orders' ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-secondary)',
                color: activeTab === 'orders' ? '#ffffff' : 'var(--color-text-secondary)',
              }}>
                {stats?.totalOrders || 0}
              </span>
            </button>

            {/* TAB: Customers */}
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                width: '100%',
                justifyContent: 'space-between',
                fontSize: 'var(--font-size-sm)',
                border: activeTab === 'customers' ? undefined : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Users size={17} />
                <span>Customers</span>
              </div>
              <span style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: activeTab === 'customers' ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-secondary)',
                color: activeTab === 'customers' ? '#ffffff' : 'var(--color-text-secondary)',
              }}>
                {stats?.totalCustomers || 0}
              </span>
            </button>

            {/* TAB: Coupons */}
            <button
              type="button"
              onClick={() => setActiveTab('coupons')}
              className={`btn ${activeTab === 'coupons' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                fontSize: 'var(--font-size-sm)',
                border: activeTab === 'coupons' ? undefined : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Tag size={17} />
                <span>Coupons</span>
              </div>
            </button>

            {/* TAB: Reviews */}
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`btn ${activeTab === 'reviews' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                fontSize: 'var(--font-size-sm)',
                border: activeTab === 'reviews' ? undefined : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Star size={17} />
                <span>Customer Reviews</span>
              </div>
            </button>

            <hr style={{ margin: 'var(--space-2) 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

            <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '0.7rem', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Storefront Shortcut
            </div>

            <Link
              to="/"
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'flex-start', fontSize: 'var(--font-size-sm)', border: 'none', color: 'var(--color-text-secondary)' }}
            >
              <ExternalLink size={17} />
              <span>Browse Store</span>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* 4 Primary Metric Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-4)',
              }}>
                {/* Total Sales Card */}
                <div className="card" style={{ padding: 'var(--space-5)', borderLeft: '4px solid #16a34a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Active Sales (COD)
                    </span>
                    <TrendingUp size={20} color="#16a34a" />
                  </div>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                    {formatINR(stats.totalSales)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 'var(--space-1)' }}>
                    Excludes cancelled orders
                  </div>
                </div>

                {/* Total Orders Card */}
                <div className="card" style={{ padding: 'var(--space-5)', borderLeft: '4px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Orders
                    </span>
                    <ShoppingBag size={20} color="var(--color-primary)" />
                  </div>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                    {stats.totalOrders}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                    Placed: {stats.ordersByStatus?.placed || 0} | Cancelled: {stats.ordersByStatus?.cancelled || 0}
                  </div>
                </div>

                {/* Total Products Card */}
                <div className="card" style={{ padding: 'var(--space-5)', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Catalog Inventory
                    </span>
                    <Package size={20} color="#8b5cf6" />
                  </div>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                    {stats.totalProducts}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: stats.lowStockProducts?.length > 0 ? '#b45309' : '#16a34a', marginTop: 'var(--space-1)' }}>
                    {stats.lowStockProducts?.length > 0
                      ? `${stats.lowStockProducts.length} low-stock alert(s)`
                      : 'All stock levels healthy'}
                  </div>
                </div>

                {/* Registered Customers Card */}
                <div className="card" style={{ padding: 'var(--space-5)', borderLeft: '4px solid #0284c7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Customers
                    </span>
                    <Users size={20} color="#0284c7" />
                  </div>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                    {stats.totalCustomers}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                    Registered customer profiles
                  </div>
                </div>
              </div>

              {/* 7-Day Revenue Trend Bar Chart */}
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                      Recent Daily Revenue Trend (Last 7 Days)
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      Aggregated order revenue in INR (cancelled orders excluded)
                    </p>
                  </div>
                </div>

                {stats.dailySales && stats.dailySales.length > 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 'var(--space-4)',
                    height: '180px',
                    paddingTop: 'var(--space-4)',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    {stats.dailySales.map((day) => {
                      const heightPercent = Math.max(12, Math.round((day.revenue / maxDayRevenue) * 100));
                      return (
                        <div
                          key={day._id}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <span style={{ fontSize: '0.7rem', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)', marginBottom: '4px' }}>
                            {formatINR(day.revenue)}
                          </span>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '44px',
                              height: `${heightPercent}%`,
                              backgroundColor: 'var(--color-primary)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height var(--transition-normal)',
                            }}
                            title={`${day._id}: ${formatINR(day.revenue)} (${day.ordersCount} orders)`}
                          />
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
                            {day._id.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-6)' }}>
                    No order transactions recorded in the past 7 days.
                  </p>
                )}
              </div>

              {/* 2-Column Split: Recent Orders Table & Low-Stock Alerts */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: 'var(--space-6)',
              }}>
                {/* Recent Orders Table */}
                <div className="card" style={{ padding: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                      Recent Orders
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="btn btn-outline"
                      style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-2)' }}
                    >
                      View All
                    </button>
                  </div>

                  {stats.recentOrders && stats.recentOrders.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {stats.recentOrders.map((order) => (
                        <div
                          key={order._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-3)',
                            backgroundColor: '#f8fafc',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>
                              {order.orderNumber}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                              {order.user?.name || 'Customer'} • {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                                {formatINR(order.totals?.grandTotal)}
                              </div>
                              <OrderStatusBadge status={order.orderStatus} style={{ fontSize: '0.65rem', padding: '1px 6px' }} />
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveTab('orders')}
                              className="btn btn-outline"
                              style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--font-size-xs)' }}
                              title="Inspect order in Orders Tab"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-4)' }}>
                      No recent orders found.
                    </p>
                  )}
                </div>

                {/* Low-Stock Alerts */}
                <div className="card" style={{ padding: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <AlertTriangle size={18} color="#dc2626" />
                      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-secondary)' }}>
                        Low Stock Products (≤ 5 units)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className="btn btn-outline"
                      style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-2)' }}
                    >
                      Manage Products
                    </button>
                  </div>

                  {stats.lowStockProducts && stats.lowStockProducts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {stats.lowStockProducts.map((prod) => (
                        <div
                          key={prod._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-3)',
                            backgroundColor: '#fffbeb',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid #fef3c7',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <img
                              src={prod.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&auto=format&fit=crop&q=80'}
                              alt={prod.name}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-secondary)' }}>
                                {prod.name}
                              </div>
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                {prod.category?.name || 'General'} • {formatINR(prod.price)}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: prod.stock <= 0 ? '#fee2e2' : '#fef3c7',
                                color: prod.stock <= 0 ? '#b91c1c' : '#b45309',
                                border: '1px solid currentColor',
                                fontSize: '0.75rem',
                                fontWeight: 'var(--font-weight-bold)',
                              }}
                            >
                              {prod.stock <= 0 ? 'Out of Stock' : `${prod.stock} left`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: 'var(--space-6)',
                      textAlign: 'center',
                      color: '#16a34a',
                      backgroundColor: '#f0fdf4',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)',
                    }}>
                      <CheckCircle2 size={24} style={{ margin: '0 auto var(--space-2)' }} />
                      <span>All product stocks are above low threshold levels.</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PRODUCT MANAGEMENT */}
          {activeTab === 'products' && (
            <ProductManagementTab onProductChanged={fetchStats} />
          )}

          {/* TAB 3: CATEGORY MANAGEMENT */}
          {activeTab === 'categories' && (
            <CategoryManagementTab onCategoryChanged={fetchStats} />
          )}

          {/* TAB 4: ORDER MANAGEMENT */}
          {activeTab === 'orders' && (
            <OrderManagementTab onOrderChanged={fetchStats} />
          )}

          {/* TAB 5: CUSTOMER DIRECTORY */}
          {activeTab === 'customers' && (
            <CustomerManagementTab />
          )}

          {/* TAB 6: COUPON MANAGEMENT */}
          {activeTab === 'coupons' && (
            <CouponManagementTab />
          )}

          {/* TAB 7: REVIEW MODERATION */}
          {activeTab === 'reviews' && (
            <ReviewManagementTab />
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
