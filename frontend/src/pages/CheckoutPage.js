// src/pages/CheckoutPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../api/services';
import { useCart } from '../context/CartContext';
import { toast } from 'react-toastify';

const initialAddress = { street: '', city: '', state: '', zip: '', country: 'US' };

export default function CheckoutPage() {
  const { cart, clearCart }   = useCart();
  const navigate              = useNavigate();
  const [address, setAddress] = useState(initialAddress);
  const [payment, setPayment] = useState('cod');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setAddress(a => ({ ...a, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    // Basic validation
    if (!address.street || !address.city || !address.zip) {
      toast.error('Please fill in all required address fields');
      return;
    }
    setLoading(true);
    try {
      const res = await orderAPI.create({ shipping_address: address, payment_method: payment });
      await clearCart();
      toast.success('Order placed successfully! 🎉');
      navigate(`/orders/${res.data.orderId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="container page">
      <h1 style={styles.title}>Checkout</h1>
      <div style={styles.layout}>

        {/* Left: Address + Payment */}
        <form onSubmit={handleSubmit} style={{ flex: 2 }}>
          <div className="card" style={styles.section}>
            <h3 style={styles.sectionTitle}>📦 Shipping Address</h3>
            <div className="form-group">
              <label>Street Address *</label>
              <input className="form-control" name="street" value={address.street} onChange={handleChange} required />
            </div>
            <div style={styles.row2}>
              <div className="form-group" style={{ flex: 2 }}>
                <label>City *</label>
                <input className="form-control" name="city" value={address.city} onChange={handleChange} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>State</label>
                <input className="form-control" name="state" value={address.state} onChange={handleChange} />
              </div>
            </div>
            <div style={styles.row2}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>ZIP Code *</label>
                <input className="form-control" name="zip" value={address.zip} onChange={handleChange} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Country</label>
                <select className="form-control" name="country" value={address.country} onChange={handleChange}>
                  <option value="US">United States</option>
                  <option value="IN">India</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card" style={styles.section}>
            <h3 style={styles.sectionTitle}>💳 Payment Method</h3>
            {[
              { value: 'cod',    label: '💵 Cash on Delivery' },
              { value: 'card',   label: '💳 Credit / Debit Card (demo)' },
              { value: 'upi',    label: '📱 UPI (demo)' },
            ].map(opt => (
              <label key={opt.value} style={styles.radioLabel}>
                <input
                  type="radio" name="payment" value={opt.value}
                  checked={payment === opt.value}
                  onChange={e => setPayment(e.target.value)}
                  style={{ marginRight: '.6rem' }}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ fontSize: '1.05rem', padding: '.75rem' }}>
            {loading ? 'Placing Order…' : `Place Order  •  $${cart.total.toFixed(2)}`}
          </button>
        </form>

        {/* Right: Order summary */}
        <div className="card" style={styles.summary}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Your Order</h3>
          {cart.items.map(item => (
            <div key={item.id} style={styles.orderItem}>
              <span style={{ flex: 1 }}>{item.name} <span style={{ color: '#94a3b8' }}>×{item.quantity}</span></span>
              <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <hr style={{ margin: '1rem 0', borderColor: '#e2e8f0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
            <span>Total</span>
            <span style={{ color: '#2563eb' }}>${cart.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  title:       { fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' },
  layout:      { display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  section:     { padding: '1.5rem', marginBottom: '1.25rem' },
  sectionTitle:{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem', color: '#1e293b' },
  row2:        { display: 'flex', gap: '1rem' },
  radioLabel:  { display: 'flex', alignItems: 'center', padding: '.6rem .75rem', borderRadius: 8, cursor: 'pointer', marginBottom: '.5rem', border: '1.5px solid #e2e8f0' },
  summary:     { flex: 1, minWidth: 240, padding: '1.5rem', position: 'sticky', top: 80 },
  orderItem:   { display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem', fontSize: '.9rem', color: '#475569' },
};