// src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const { signIn, signInWithGoogle, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();

  const [tab,     setTab]    = useState('password'); // 'password' | 'magic'
  const [email,   setEmail]  = useState('');
  const [password,setPass]   = useState('');
  const [loading, setLoad]   = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error,   setError]  = useState('');

  // ── Email + password login ────────────────────────────────
  const handlePassword = async (e) => {
    e.preventDefault();
    setLoad(true); setError('');
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setLoad(false); }
  };

  // ── Magic link login ──────────────────────────────────────
  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoad(true); setError('');
    try {
      await signInWithMagicLink(email);
      setMagicSent(true);
      toast.success('Magic link sent! Check your email.');
    } catch (err) {
      setError(err.message || 'Failed to send magic link');
    } finally { setLoad(false); }
  };

  // ── Google OAuth ──────────────────────────────────────────
  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
      // Redirect happens automatically; page will reload via /auth/callback
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.brand}>
          <h1 style={s.title}>Welcome back</h1>
          <p style={s.subtitle}>Sign in to your ShopZone account</p>
        </div>

        {/* Google OAuth */}
        <button style={s.googleBtn} onClick={handleGoogle}>
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: 10 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div style={s.divider}>
          <div style={{ flex: 1, borderTop: '1.5px solid #e2e8f0' }}></div>
          <span style={{ padding: '0 0.75rem' }}>or</span>
          <div style={{ flex: 1, borderTop: '1.5px solid #e2e8f0' }}></div>
        </div>

        {/* Tab switch */}
        <div style={s.tabs}>
          <button
            style={{ ...s.tab, ...(tab === 'password' ? s.tabActive : {}) }}
            onClick={() => { setTab('password'); setError(''); setMagicSent(false); }}>
            Password
          </button>
          <button
            style={{ ...s.tab, ...(tab === 'magic' ? s.tabActive : {}) }}
            onClick={() => { setTab('magic'); setError(''); }}>
            Magic Link
          </button>
        </div>

        {error && <p style={s.error}>{error}</p>}

        {/* Password form */}
        {tab === 'password' && (
          <form onSubmit={handlePassword}>
            <div style={s.group}>
              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div style={s.group}>
              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                value={password}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button style={s.primaryBtn} type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Magic link form */}
        {tab === 'magic' && !magicSent && (
          <form onSubmit={handleMagicLink}>
            <div style={s.group}>
              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button style={s.primaryBtn} type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send Magic Link'}
            </button>
          </form>
        )}

        {magicSent && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <h2 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
              We sent a magic sign-in link to <strong>{email}</strong>.<br/>
              Click the link to log in instantly.
            </p>
          </div>
        )}

        <p style={s.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={s.link}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f8fafc', padding: '2rem'
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
  },
  brand: { textAlign: 'center', marginBottom: '1.5rem' },
  brandIcon: { fontSize: '2.5rem' },
  title: { fontSize: '1.7rem', fontWeight: 800, color: '#1e293b', margin: '0.4rem 0 0.2rem' },
  subtitle: { color: '#64748b', fontSize: '.95rem', margin: 0 },
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem 1rem',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    background: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#1e293b',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '1rem',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    color: '#94a3b8',
    fontSize: '.85rem',
    marginBottom: '1rem',
  },
  tabs: {
    display: 'flex',
    background: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: '1.25rem',
  },
  tab: {
    flex: 1,
    padding: '0.5rem',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '.9rem',
    fontWeight: 500,
    color: '#64748b',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: '#fff',
    color: '#2563eb',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  group: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: 6, fontSize: '.875rem', fontWeight: 600, color: '#374151' },
  input: {
    width: '100%',
    padding: '0.7rem 0.9rem',
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  primaryBtn: {
    width: '100%', padding: '.8rem',
    background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: '1rem',
    fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s', marginTop: '.5rem'
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '0.65rem 1rem',
    borderRadius: 8,
    fontSize: '.875rem',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  },
  magicSuccess: {
    textAlign: 'center',
    padding: '1.5rem 1rem',
    background: '#f0fdf4',
    borderRadius: 12,
    border: '1px solid #bbf7d0',
    margin: '0.5rem 0',
  },
  footer: { textAlign: 'center', color: '#64748b', fontSize: '.9rem', marginTop: '1.5rem', marginBottom: 0 },
  link: { color: '#2563eb', fontWeight: 700, textDecoration: 'none' },
};