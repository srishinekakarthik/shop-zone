// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Layout
import Navbar    from './components/common/Navbar';
import Footer    from './components/common/Footer';
import Spinner   from './components/common/Spinner';
import ChatBot   from './components/common/ChatBot';

// Public pages
import HomePage        from './pages/HomePage';
import ProductsPage    from './pages/ProductsPage';
import ProductDetail   from './pages/ProductDetailPage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

// Protected pages
import CartPage        from './pages/CartPage';
import CheckoutPage    from './pages/CheckoutPage';
import OrdersPage      from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProfilePage     from './pages/ProfilePage';

// Admin pages
import AdminDashboard  from './pages/admin/AdminDashboard';
import AdminProducts   from './pages/admin/AdminProducts';
import AdminOrders     from './pages/admin/AdminOrders';
import AdminUsers      from './pages/admin/AdminUsers';

// ── Route guards ─────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ minHeight: '80vh', padding: '1rem 0' }}>
        <Routes>
          {/* Public */}
          <Route path="/"                  element={<HomePage />} />
          <Route path="/products"          element={<ProductsPage />} />
          <Route path="/products/:slug"    element={<ProductDetail />} />
          <Route path="/login"             element={<LoginPage />} />
          <Route path="/register"          element={<RegisterPage />} />

          {/* OAuth / Magic Link / Email confirmation callback */}
          <Route path="/auth/callback"     element={<AuthCallbackPage />} />

          {/* Protected */}
          <Route path="/cart"              element={<PrivateRoute><CartPage /></PrivateRoute>} />
          <Route path="/checkout"          element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
          <Route path="/orders"            element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
          <Route path="/orders/:id"        element={<PrivateRoute><OrderDetailPage /></PrivateRoute>} />
          <Route path="/profile"           element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin"             element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/products"    element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="/admin/orders"      element={<AdminRoute><AdminOrders /></AdminRoute>} />
          <Route path="/admin/users"       element={<AdminRoute><AdminUsers /></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <ChatBot />
      </main>
      <Footer />
      <ToastContainer position="bottom-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </AuthProvider>
  );
}