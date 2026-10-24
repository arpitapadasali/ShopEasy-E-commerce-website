import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('shopeasy_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and verify stored session on mount
  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('shopeasy_token');
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      if (data.success && data.user) {
        setUser(data.user);
        setToken(storedToken);
      } else {
        throw new Error('Failed to verify session');
      }
    } catch (err) {
      console.warn('[AuthContext] Session expired or invalid token:', err.message);
      localStorage.removeItem('shopeasy_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    try {
      const data = await authService.login({ email, password });
      if (data.token && data.user) {
        localStorage.setItem('shopeasy_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      }
      throw new Error(data.message || 'Login failed');
    } catch (err) {
      const message = err.message || 'Invalid email or password';
      setError(message);
      return { success: false, message };
    }
  };

  // Register handler
  const register = async (userData) => {
    setError(null);
    try {
      const data = await authService.register(userData);
      if (data.token && data.user) {
        localStorage.setItem('shopeasy_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      }
      throw new Error(data.message || 'Registration failed');
    } catch (err) {
      const message = err.message || 'Registration failed';
      setError(message);
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('[AuthContext] Logout request error:', err.message);
    } finally {
      localStorage.removeItem('shopeasy_token');
      setUser(null);
      setToken(null);
      setError(null);
    }
  };

  // Profile update handler
  const updateProfile = async (profileData) => {
    setError(null);
    try {
      const data = await authService.updateProfile(profileData);
      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      }
      throw new Error(data.message || 'Profile update failed');
    } catch (err) {
      const message = err.message || 'Profile update failed';
      setError(message);
      return { success: false, message };
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    refreshUser: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
