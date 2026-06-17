// src/components/common/Navbar.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount }    = useCart();
  const navigate         = useNavigate();
  const [open, setOpen]  = useState(false); // mobile menu

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>🛍 ShopZone</Link>

        {/* Desktop links */}
        <ul style={styles.links}>
          <li><Link to="/products" style={styles.link}>Products</Link></li>
          {user && <li><Link to="/orders" style={styles.link}>Orders</Link></li>}
          {user?.role === 'admin' && (
            <li><Link to="/admin" style={{ ...styles.link, color: '#f59e0b' }}>Admin</Link></li>
          )}
        </ul>

        {/* Right side */}
        <div style={styles.right}>
          {/* Cart icon */}
          <Link to="/cart" style={styles.cartBtn}>
            🛒
            {itemCount > 0 && <span style={styles.badge}>{itemCount}</span>}
          </Link>

          {user ? (
            <div style={styles.userMenu}>
              <button onClick={() => setOpen(!open)} style={styles.avatarBtn}>
                {user.name?.charAt(0).toUpperCase()} ▾
              </button>
              {open && (
                <div style={styles.dropdown}>
                  <Link to="/profile" style={styles.ddItem} onClick={() => setOpen(false)}>Profile</Link>
                  <Link to="/orders"  style={styles.ddItem} onClick={() => setOpen(false)}>My Orders</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" style={styles.ddItem} onClick={() => setOpen(false)}>Admin Panel</Link>
                  )}
                  <button onClick={handleLogout} style={{ ...styles.ddItem, color: '#dc2626', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login"    style={styles.link}>Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav:       { background: '#1e293b', color: '#fff', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,.3)' },
  inner:     { maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: '60px', gap: '1.5rem' },
  logo:      { color: '#fff', fontWeight: 800, fontSize: '1.3rem', flexShrink: 0 },
  links:     { display: 'flex', listStyle: 'none', gap: '1.25rem', flex: 1 },
  link:      { color: '#cbd5e1', fontSize: '.95rem', transition: 'color .15s' },
  right:     { display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 },
  cartBtn:   { position: 'relative', fontSize: '1.4rem', color: '#fff' },
  badge:     { position: 'absolute', top: '-6px', right: '-8px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700 },
  userMenu:  { position: 'relative' },
  avatarBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '.35rem .75rem', cursor: 'pointer', fontWeight: 700 },
  dropdown:  { position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,.12)', minWidth: '160px', overflow: 'hidden', zIndex: 200 },
  ddItem:    { display: 'block', padding: '.6rem 1rem', color: '#1e293b', fontSize: '.9rem', cursor: 'pointer' },
};