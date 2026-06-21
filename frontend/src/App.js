// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Layout
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Spinner from './components/common/Spinner';
import ChatBot from './components/common/ChatBot';

// Public pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetail from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SupplierRegisterPage from './pages/SupplierRegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import UnsubscribePage from './pages/UnsubscribePage';

// Protected pages
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProfilePage from './pages/ProfilePage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSuppliers from './pages/admin/AdminSuppliers';

// Supplier (vendor) pages
import SupplierDashboard from './pages/supplier/SupplierDashboard';
import SupplierProducts from './pages/supplier/SupplierProducts';
import SupplierOrders from './pages/supplier/SupplierOrders';
import SupplierRestockAlerts from './pages/supplier/SupplierRestockAlerts';
import SupplierBulkImport from './pages/supplier/SupplierBulkImport';
import SupplierPendingPage from './pages/supplier/SupplierPendingPage';

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

// A supplier route requires role === 'supplier'. It does NOT require
// approval — SupplierLayout below decides whether to render the
// requested page or the SupplierPendingPage, so a not-yet-approved
// vendor still lands somewhere coherent instead of being bounced home.
function SupplierRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user?.role === 'supplier' ? children : <Navigate to="/" replace />;
}

// Gates the actual supplier page behind approval status; unapproved/
// rejected suppliers always see SupplierPendingPage regardless of
// which supplier URL they navigated to.
function SupplierGate({ children }) {
  const { user } = useAuth();
  return user?.supplierStatus === 'approved' ? children : <SupplierPendingPage />;
}

function AppRoutes() {
  const location = useLocation();
  const isStaffArea = location.pathname.startsWith('/admin') || location.pathname.startsWith('/supplier');

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '80vh', padding: '1rem 0' }}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/sell" element={<SupplierRegisterPage />} />

          {/* OAuth / Magic Link / Email confirmation callback */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />

          {/* Protected */}
          <Route path="/cart" element={<PrivateRoute><CartPage /></PrivateRoute>} />
          <Route path="/checkout" element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
          <Route path="/orders/:id" element={<PrivateRoute><OrderDetailPage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/suppliers" element={<AdminRoute><AdminSuppliers /></AdminRoute>} />

          {/* Supplier (vendor) — SupplierRoute checks role, SupplierGate checks approval */}
          <Route path="/supplier" element={<SupplierRoute><SupplierGate><SupplierDashboard /></SupplierGate></SupplierRoute>} />
          <Route path="/supplier/products" element={<SupplierRoute><SupplierGate><SupplierProducts /></SupplierGate></SupplierRoute>} />
          <Route path="/supplier/products/new" element={<SupplierRoute><SupplierGate><SupplierProducts /></SupplierGate></SupplierRoute>} />
          <Route path="/supplier/orders" element={<SupplierRoute><SupplierGate><SupplierOrders /></SupplierGate></SupplierRoute>} />
          <Route path="/supplier/restock-alerts" element={<SupplierRoute><SupplierGate><SupplierRestockAlerts /></SupplierGate></SupplierRoute>} />
          <Route path="/supplier/bulk-import" element={<SupplierRoute><SupplierGate><SupplierBulkImport /></SupplierGate></SupplierRoute>} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {!isStaffArea && <ChatBot />}
      </main>
      <Footer />
      <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}