import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, User, LogOut, LogIn, UserPlus, ShoppingCart, Package, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { totalItems } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header style={{
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '4rem',
      }}>
        {/* Brand Logo & Name */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'inherit' }}>
          <ShoppingBag size={24} color="var(--color-primary)" />
          <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
            ShopEasy
          </span>
        </Link>

        {/* Right Navigation & User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {isAuthenticated ? (
            <>
              {/* Synchronized Cart Link with Badge */}
              <Link
                to="/cart"
                className="btn btn-outline nav-btn-compact"
                style={{
                  position: 'relative',
                  padding: 'var(--space-2) var(--space-3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
                title="Shopping Cart"
                aria-label={`Cart with ${totalItems} items`}
              >
                <ShoppingCart size={18} />
                <span className="nav-text-hide" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                  Cart
                </span>
                {totalItems > 0 && (
                  <span
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 'var(--font-weight-bold)',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>

              {/* Synchronized Wishlist Link with Badge */}
              <Link
                to="/wishlist"
                className="btn btn-outline nav-btn-compact"
                style={{
                  position: 'relative',
                  padding: 'var(--space-2) var(--space-3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
                title="My Wishlist"
                aria-label={`Wishlist with ${wishlistCount} items`}
              >
                <Heart size={18} color="var(--color-danger)" fill={wishlistCount > 0 ? 'var(--color-danger)' : 'none'} />
                <span className="nav-text-hide" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                  Wishlist
                </span>
                {wishlistCount > 0 && (
                  <span
                    style={{
                      backgroundColor: 'var(--color-danger)',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 'var(--font-weight-bold)',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="badge badge-primary nav-btn-compact"
                  style={{ textDecoration: 'none', gap: 'var(--space-1)', padding: 'var(--space-1) var(--space-3)' }}
                >
                  <ShieldCheck size={14} />
                  <span className="nav-text-hide">Admin</span>
                </Link>
              )}

              <Link
                to="/orders"
                className="btn btn-outline nav-btn-compact"
                style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
                title="My Orders"
              >
                <Package size={14} />
                <span className="nav-text-hide">Orders</span>
              </Link>

              <Link
                to="/profile"
                className="btn btn-outline nav-btn-compact"
                style={{ fontSize: 'var(--font-size-xs)', gap: 'var(--space-2)' }}
                title="Account Profile"
              >
                <User size={14} />
                <span className="nav-text-hide">{user?.name?.split(' ')[0] || 'Profile'}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="btn btn-outline nav-btn-compact"
                title="Sign Out"
                style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline nav-btn-compact" style={{ fontSize: 'var(--font-size-xs)' }}>
                <LogIn size={14} />
                <span className="nav-text-hide">Sign In</span>
              </Link>
              <Link to="/register" className="btn btn-primary nav-btn-compact" style={{ fontSize: 'var(--font-size-xs)' }}>
                <UserPlus size={14} />
                <span className="nav-text-hide">Register</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
