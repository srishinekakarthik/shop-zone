// src/pages/SupplierRegisterPage.js
// Separate from RegisterPage.js (customer signup) because this flow needs
// an extra business_name field and passes role: 'supplier' in the signup
// metadata, which the handle_new_user() DB trigger (see
// database/migrations_marketplace.sql) reads to create both a profiles
// row with role='supplier' AND a suppliers row with status='pending'.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function SupplierRegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', businessName: '', email: '', password: '', confirm: '' });
  const [loading, setLoad] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!form.businessName.trim()) { setError('Business name is required'); return; }
    setLoad(true); setError('');

    try {
      await signUp(form.email, form.password, form.name, {
        role: 'supplier',
        business_name: form.businessName.trim(),
      });
      toast.success('Vendor account created successfully!');
      navigate('/supplier');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally { setLoad(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.brand}>
          <div style={{ fontSize: '2rem' }}></div>
          <h1 style={s.title}>Become a ShopZone Vendor</h1>
          <p style={s.subtitle}>Sell your products to thousands of customers</p>
        </div>

        <div style={s.infoBox}>
          Vendor accounts require admin approval before you can list products.
          We'll review your application shortly after sign-up.
        </div>

        {error && <p style={s.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={s.group}>
            <label style={s.label}>Your Name</label>
            <input style={s.input} name="name" value={form.name} onChange={handleChange} placeholder="Jane Doe" required />
          </div>
          <div style={s.group}>
            <label style={s.label}>Business / Store Name</label>
            <input style={s.input} name="businessName" value={form.businessName} onChange={handleChange} placeholder="Acme Electronics" required />
          </div>
          <div style={s.group}>
            <label style={s.label}>Business Email</label>
            <input style={s.input} type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@business.com" required />
          </div>
          <div style={s.group}>
            <label style={s.label}>Password <span style={{ color: '#94a3b8', fontWeight: 400 }}>(min 6 chars)</span></label>
            <input style={s.input} type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" minLength={6} required />
          </div>
          <div style={s.group}>
            <label style={s.label}>Confirm Password</label>
            <input style={s.input} type="password" name="confirm" value={form.confirm} onChange={handleChange} placeholder="••••••••" required />
          </div>
          <button style={s.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Creating vendor account…' : 'Apply to Sell on ShopZone'}
          </button>
        </form>

        <p style={s.footer}>
          Just want to shop? <Link to="/register" style={s.link}>Create a customer account</Link>
        </p>
        <p style={s.footer}>
          Already have an account? <Link to="/login" style={s.link}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' },
  card: { background: '#fff', borderRadius: 20, padding: '2.5rem 2rem', width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.10)' },
  brand: { textAlign: 'center', marginBottom: '1.25rem' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '0.4rem 0 0.2rem' },
  subtitle: { color: '#64748b', fontSize: '.95rem', margin: 0 },
  infoBox: { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.85rem', lineHeight: 1.5, marginBottom: '1.25rem' },
  group: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: 6, fontSize: '.875rem', fontWeight: 600, color: '#374151' },
  input: { width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' },
  submitBtn: { width: '100%', padding: '.8rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 700, cursor: 'pointer' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.65rem 1rem', borderRadius: 8, fontSize: '.875rem', marginBottom: '1rem', border: '1px solid #fecaca' },
  footer: { textAlign: 'center', color: '#64748b', fontSize: '.9rem', marginTop: '1rem', marginBottom: 0 },
  link: { color: '#7c3aed', fontWeight: 700, textDecoration: 'none' },
};
