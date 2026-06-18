// src/api/services.js
// All API calls grouped by domain. Import only what you need.
import api from './axios';

// ── Auth ─────────────────────────────────────────────────────
// Note: register() and login() are now handled by the Supabase Auth SDK
// in AuthContext.js. This API layer only handles server-side profile endpoints.
export const authAPI = {
  getMe:       ()     => api.get('/auth/me'),
  syncProfile: (data) => api.post('/auth/sync-profile', data),
};

// ── Products ─────────────────────────────────────────────────
export const productAPI = {
  getAll:   (params) => api.get('/products', { params }),    // search/filter/page
  getBySlug:(slug)   => api.get(`/products/${slug}`),
  create:   (data)   => api.post('/products', data),
  update:   (id, data) => api.put(`/products/${id}`, data),
  remove:   (id)     => api.delete(`/products/${id}`),
  addReview:(id, data) => api.post(`/products/${id}/reviews`, data),
};

// ── Categories ───────────────────────────────────────────────
export const categoryAPI = {
  getAll:   ()       => api.get('/categories'),
  create:   (data)   => api.post('/categories', data),
  update:   (id, d)  => api.put(`/categories/${id}`, d),
  remove:   (id)     => api.delete(`/categories/${id}`),
};

// ── Cart ─────────────────────────────────────────────────────
export const cartAPI = {
  get:      ()            => api.get('/cart'),
  add:      (data)        => api.post('/cart', data),
  update:   (id, qty)     => api.put(`/cart/${id}`, { quantity: qty }),
  remove:   (id)          => api.delete(`/cart/${id}`),
  clear:    ()            => api.delete('/cart'),
};

// ── Orders ───────────────────────────────────────────────────
export const orderAPI = {
  create:   (data)  => api.post('/orders', data),
  getAll:   ()      => api.get('/orders'),
  getById:  (id)    => api.get(`/orders/${id}`),
};

// ── Users ────────────────────────────────────────────────────
export const userAPI = {
  getProfile:     ()     => api.get('/users/profile'),
  updateProfile:  (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/password', data),
};

// ── Admin ────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard:      ()          => api.get('/admin/dashboard'),
  getOrders:         (params)    => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, status)=> api.patch(`/admin/orders/${id}/status`, { status }),
  getUsers:          ()          => api.get('/admin/users'),
};