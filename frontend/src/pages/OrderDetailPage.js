// src/pages/OrderDetailPage.js
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../api/services';
import Spinner from '../components/common/Spinner';

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'];
const STATUS_BADGE = { pending:'badge-warning', processing:'badge-info', shipped:'badge-info', delivered:'badge-success', cancelled:'badge-danger' };

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderAPI.getById(id)
      .then(r => setOrder(r.data.order))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (!order)  return <div className="container page"><p>Order not found.</p></div>;

  const addr    = typeof order.shipping_address === 'string'
    ? JSON.parse(order.shipping_address)
    : order.shipping_address;
  const stepIdx = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Order #{order.id}</h1>
          <p style={{ color: '#64748b', fontSize: '.9rem' }}>Placed on {new Date(order.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
        </div>
        <span className={`badge ${STATUS_BADGE[order.status] || 'badge-info'}`} style={{ fontSize: '1rem', padding: '.4rem 1rem' }}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Progress tracker (hidden for cancelled) */}
      {order.status !== 'cancelled' && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={styles.tracker}>
            {STATUS_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ ...styles.dot, background: i <= stepIdx ? '#2563eb' : '#e2e8f0', color: i <= stepIdx ? '#fff' : '#94a3b8' }}>
                    {i < stepIdx ? '✓' : i + 1}
                  </div>
                  <p style={{ fontSize: '.78rem', marginTop: '.4rem', color: i <= stepIdx ? '#2563eb' : '#94a3b8', fontWeight: i === stepIdx ? 700 : 400, textTransform: 'capitalize' }}>{step}</p>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div style={{ flex: 2, height: 3, background: i < stepIdx ? '#2563eb' : '#e2e8f0', marginTop: '16px', alignSelf: 'flex-start' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div style={styles.layout}>
        {/* Items */}
        <div className="card" style={{ flex: 2, padding: '1.5rem' }}>
          <h3 style={styles.sectionH3}>Items Ordered</h3>
          {order.items.map((item, i) => (
            <div key={i} style={styles.itemRow}>
              <img src={item.image_url || 'https://placehold.co/60x60?text=?'} alt={item.name} style={styles.thumb} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>{item.name}</p>
                <p style={{ color: '#64748b', fontSize: '.85rem' }}>Qty: {item.quantity} × ${parseFloat(item.unit_price).toFixed(2)}</p>
              </div>
              <p style={{ fontWeight: 700 }}>${(item.quantity * item.unit_price).toFixed(2)}</p>
            </div>
          ))}
          <hr style={{ margin: '1rem 0', borderColor: '#e2e8f0' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: 800, fontSize: '1.1rem', gap: '2rem' }}>
            <span>Total</span>
            <span style={{ color: '#2563eb' }}>${parseFloat(order.total_amount).toFixed(2)}</span>
          </div>
        </div>

        {/* Summary sidebar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={styles.sectionH3}>Shipping Address</h3>
            <p style={{ color: '#475569', lineHeight: 1.8 }}>
              {addr.street}<br />{addr.city}, {addr.state} {addr.zip}<br />{addr.country}
            </p>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={styles.sectionH3}>Payment</h3>
            <p style={{ color: '#475569', textTransform: 'uppercase', fontWeight: 600 }}>{order.payment_method}</p>
            <p style={{ color: order.payment_status === 'paid' ? '#16a34a' : '#f59e0b', fontWeight: 600, fontSize: '.9rem', marginTop: '.25rem' }}>
              {order.payment_status}
            </p>
          </div>
        </div>
      </div>

      <Link to="/orders" style={{ display: 'inline-block', marginTop: '1.5rem', color: '#2563eb', fontWeight: 600 }}>
        ← Back to Orders
      </Link>
    </div>
  );
}

const styles = {
  layout:    { display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  tracker:   { display: 'flex', alignItems: 'flex-start' },
  dot:       { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.9rem', margin: '0 auto' },
  sectionH3: { fontWeight: 700, marginBottom: '1rem', fontSize: '1rem', color: '#1e293b' },
  itemRow:   { display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 0', borderBottom: '1px solid #f1f5f9' },
  thumb:     { width: 60, height: 60, objectFit: 'cover', borderRadius: 8 },
};