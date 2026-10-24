import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import { WishlistProvider } from '../context/WishlistContext.jsx';
import { Layout } from '../components/layout/Layout.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { ProductDetailPage } from '../pages/ProductDetailPage.jsx';
import { CartPage } from '../pages/CartPage.jsx';
import { WishlistPage } from '../pages/WishlistPage.jsx';
import { OrdersPage } from '../pages/OrdersPage.jsx';
import { OrderDetailPage } from '../pages/OrderDetailPage.jsx';
import { CheckoutPage } from '../pages/CheckoutPage.jsx';
import { OrderConfirmationPage } from '../pages/OrderConfirmationPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { AdminDashboardPage } from '../pages/AdminDashboardPage.jsx';
import { UnauthorizedPage } from '../pages/UnauthorizedPage.jsx';
import { ProtectedRoute } from '../components/common/ProtectedRoute.jsx';
import { AdminRoute } from '../components/common/AdminRoute.jsx';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                {/* Public Authentication & Status Routes */}
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="unauthorized" element={<UnauthorizedPage />} />

                {/* Authenticated Shopping & Customer Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route index element={<HomePage />} />
                  <Route path="products/:id" element={<ProductDetailPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="wishlist" element={<WishlistPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:id" element={<OrderDetailPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="order-confirmation/:id" element={<OrderConfirmationPage />} />
                </Route>

                {/* Administrator Only Protected Routes */}
                <Route element={<AdminRoute />}>
                  <Route path="admin" element={<AdminDashboardPage />} />
                </Route>

                {/* Catch-all Not Found Route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
