// src/pages/admin/AdminProducts.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productAPI, categoryAPI } from '../../api/services';
import { toast } from 'react-toastify';
import Spinner from '../../components/common/Spinner';

const EMPTY_FORM = { name: '', description: '', price: '', stock: '', category_id: '', image_url: '', is_active: 1 };

export default function AdminProducts() {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([productAPI.getAll({ limit: 100, all: '1' }), categoryAPI.getAll()])
      .then(([pr, cr]) => { setProducts(pr.data.products); setCategories(cr.data.categories); })
      .finally(() => setLoading(false));
  };
  useEffect(fetchAll, []);

  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (p) => {
    setForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock, category_id: p.category_id, image_url: p.image_url || '', is_active: p.is_active });
    setEditId(p.id); setShowForm(true);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    // Convert is_active from select string ("1"/"0") to boolean
    if (name === 'is_active') {
      setForm(f => ({ ...f, is_active: value === '1' }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        await productAPI.update(editId, form);
        toast.success('Product updated');
      } else {
        await productAPI.create(form);
        toast.success('Product created');
      }
      setShowForm(false); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"?`)) return;
    try { await productAPI.remove(id); toast.info('Product deactivated'); fetchAll(); }
    catch { toast.error('Delete failed'); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="container page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>← Back to Dashboard</Link>
      </div>
      <div style={styles.header}>
        <h1 style={styles.title}>Products ({products.length})</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      {/* Form modal-like panel */}
      {showForm && (
        <div className="card" style={styles.formPanel}>
          <h2 style={{ marginBottom: '1.25rem', fontWeight: 700 }}>{editId ? 'Edit Product' : 'New Product'}</h2>
          <form onSubmit={handleSave}>
            <div style={styles.formGrid}>
              <div className="form-group">
                <label>Name *</label>
                <input className="form-control" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select className="form-control" name="category_id" value={form.category_id} onChange={handleChange} required>
                  <option value="">Select…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Price ($) *</label>
                <input className="form-control" name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Stock *</label>
                <input className="form-control" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Image URL</label>
                <input className="form-control" name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://…" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea className="form-control" name="description" value={form.description} onChange={handleChange} rows={3} />
              </div>
              {editId && (
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="form-control"
                    name="is_active"
                    value={form.is_active ? '1' : '0'}
                    onChange={handleChange}
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Products table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Image</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Stock</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={styles.tr}>
                <td style={styles.td}><img src={p.image_url || 'https://placehold.co/50x50?text=?'} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} /></td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{p.name}</td>
                <td style={styles.td}>{p.category_name}</td>
                <td style={styles.td}>${parseFloat(p.price).toFixed(2)}</td>
                <td style={styles.td}>{p.stock}</td>
                <td style={styles.td}>
                  <span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title:     { fontSize: '1.5rem', fontWeight: 700 },
  formPanel: { padding: '2rem', marginBottom: '1.5rem' },
  formGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' },
  thead:     { background: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  tr:        { borderBottom: '1px solid #f1f5f9' },
  th:        { padding: '.75rem 1rem', fontWeight: 700, textAlign: 'left', color: '#475569' },
  td:        { padding: '.75rem 1rem' },
};