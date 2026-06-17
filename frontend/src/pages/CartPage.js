// src/pages/CartPage.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { toast } from 'react-toastify';

export default function CartPage() {
  const { cart, itemCount, updateItem, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  const handleUpdate = async (id, qty) => {
    try { await updateItem(id, qty); }
    catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  const handleRemove = async (id) => {
    try { await removeItem(id); toast.info('Item removed'); }
    catch { toast.error('Could not remove item'); }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear your entire cart?')) return;
    await clearCart();
    toast.info('Cart cleared');
  };

  if (itemCount === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ fontSize: '4rem' }}>🛒</p>
        <h2>Your cart is empty</h2>
        <p style={{ color: '#64748b', margin: '.5rem 0 1.5rem' }}>Add some products to get started.</p>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div className="container page">
      <div style={styles.header}>
        <h1 style={styles.title}>Shopping Cart ({itemCount} item{itemCount > 1 ? 's' : ''})</h1>
        <button className="btn btn-danger btn-sm" onClick={handleClear}>Clear Cart</button>
      </div>

      <div style={styles.layout}>
        {/* Items list */}
        <div style={{ flex: 2 }}>
          {cart.items.map(item => (
            <div key={item.id} className="card" style={styles.item}>
              <img
                src={item.image_url || 'https://placehold.co/80x80?text=?'}
                alt={item.name}
                style={styles.thumb}
              />
              <div style={{ flex: 1 }}>
                <Link to={`/products/${item.slug}`} style={styles.itemName}>{item.name}</Link>
                <p style={styles.itemPrice}>${parseFloat(item.price).toFixed(2)} each</p>
              </div>
              {/* Qty stepper */}
              <div style={styles.qtyRow}>
                <button className="btn btn-outline btn-sm" onClick={() => handleUpdate(item.id, item.quantity - 1)}>−</button>
                <span style={{ padding: '0 .75rem', fontWeight: 700, minWidth: 30, textAlign: 'center' }}>{item.quantity}</span>
                <button className="btn btn-outline btn-sm" onClick={() => handleUpdate(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
              </div>
              <p style={styles.subtotal}>${(item.price * item.quantity).toFixed(2)}</p>
              <button
                onClick={() => handleRemove(item.id)}
                style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '1.2rem', cursor: 'pointer', padding: '0 .5rem' }}
                title="Remove"
              >×</button>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="card" style={styles.summary}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Order Summary</h3>
          <div style={styles.summaryRow}><span>Subtotal</span><span>${cart.total.toFixed(2)}</span></div>
          <div style={styles.summaryRow}><span>Shipping</span><span style={{ color: '#16a34a' }}>Free</span></div>
          <hr style={{ margin: '1rem 0', borderColor: '#e2e8f0' }} />
          <div style={{ ...styles.summaryRow, fontWeight: 800, fontSize: '1.15rem' }}>
            <span>Total</span><span style={{ color: '#2563eb' }}>${cart.total.toFixed(2)}</span>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }} onClick={() => navigate('/checkout')}>
            Proceed to Checkout →
          </button>
          <Link to="/products" style={{ display: 'block', textAlign: 'center', marginTop: '.75rem', color: '#2563eb', fontSize: '.9rem' }}>
            ← Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  empty:      { textAlign: 'center', padding: '5rem 2rem' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title:      { fontSize: '1.6rem', fontWeight: 700 },
  layout:     { display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  item:       { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', marginBottom: '1rem' },
  thumb:      { width: 80, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
  itemName:   { fontWeight: 600, color: '#1e293b', fontSize: '.95rem' },
  itemPrice:  { color: '#64748b', fontSize: '.85rem', marginTop: '.25rem' },
  qtyRow:     { display: 'flex', alignItems: 'center' },
  subtotal:   { fontWeight: 700, minWidth: 70, textAlign: 'right' },
  summary:    { flex: 1, minWidth: 260, padding: '1.5rem', position: 'sticky', top: 80 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem', fontSize: '.95rem' },
};