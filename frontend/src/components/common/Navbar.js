// src/components/common/Navbar.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile menu

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          ShopZone
        </Link>

        {/* Desktop links */}
        <ul style={styles.links}>
          <li><Link to="/products" style={styles.link}>Products</Link></li>
          {user && <li><Link to="/orders" style={styles.link}>Orders</Link></li>}
          <li>
            <Link to="/cart" style={{ ...styles.link, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Cart
              {itemCount > 0 && <span style={styles.textBadge}>{itemCount}</span>}
            </Link>
          </li>
          {user?.role === 'admin' && (
            <li><Link to="/admin" style={{ ...styles.link, color: '#f59e0b' }}>Admin</Link></li>
          )}
          {user?.role === 'supplier' && (
            <li>
              <Link to="/supplier" style={{ ...styles.link, color: '#a78bfa' }}>
                Vendor Dashboard
                {user.supplierStatus === 'pending' && <span style={styles.pendingDot} title="Pending approval" />}
              </Link>
            </li>
          )}
          {!user && (
            <li><Link to="/sell" style={{ ...styles.link, color: '#a78bfa' }}>Sell on ShopZone</Link></li>
          )}
        </ul>

        {/* Right side */}
        <div style={styles.right}>

          {user ? (
            <div style={styles.userMenu}>
              <button onClick={() => setOpen(!open)} style={styles.avatarBtn}>
                {user.name} ▾
              </button>
              {open && (
                <div style={styles.dropdown}>
                  <Link to="/profile" style={styles.ddItem} onClick={() => setOpen(false)}>Profile</Link>
                  <Link to="/orders" style={styles.ddItem} onClick={() => setOpen(false)}>My Orders</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" style={styles.ddItem} onClick={() => setOpen(false)}>Admin Panel</Link>
                  )}
                  {user.role === 'supplier' && (
                    <Link to="/supplier" style={styles.ddItem} onClick={() => setOpen(false)}>Vendor Dashboard</Link>
                  )}
                  <button onClick={handleLogout} style={{ ...styles.ddItem, color: '#dc2626', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" style={styles.link}>Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: { background: '#1e293b', color: '#fff', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,.3)' },
  inner: { maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: '60px', gap: '1.5rem' },
  logo: { color: '#fff', fontWeight: 800, fontSize: '1.3rem', flexShrink: 0, display: 'flex', alignItems: 'center' },
  links: { display: 'flex', alignItems: 'center', listStyle: 'none', gap: '1.25rem', flex: 1 },
  link: { color: '#cbd5e1', fontSize: '.95rem', transition: 'color .15s' },
  right: { display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 },
  textBadge: { background: '#ef4444', color: '#fff', borderRadius: '12px', padding: '0 6px', fontSize: '.7rem', fontWeight: 700, lineHeight: '18px' },
  pendingDot: { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', marginLeft: 6 },
  userMenu: { position: 'relative' },
  avatarBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '.35rem .75rem', cursor: 'pointer', fontWeight: 700 },
  dropdown: { position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,.12)', minWidth: '160px', overflow: 'hidden', zIndex: 200 },
  ddItem: { display: 'block', padding: '.6rem 1rem', color: '#1e293b', fontSize: '.9rem', cursor: 'pointer' },
};