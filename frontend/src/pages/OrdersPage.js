// src/pages/OrdersPage.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../api/services';
import Spinner from '../components/common/Spinner';

const STATUS_BADGE = {
  pending:    'badge-warning',
  processing: 'badge-info',
  shipped:    'badge-info',
  delivered:  'badge-success',
  cancelled:  'badge-danger',
};

export default function OrdersPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderAPI.getAll()
      .then(r => setOrders(r.data.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="container page">
      <h1 style={styles.title}>My Orders</h1>
      {orders.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: '3rem' }}>📦</p>
          <p>You haven't placed any orders yet.</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: '1rem' }}>Start Shopping</Link>
        </div>
      ) : (
        <div>
          {orders.map(order => (
            <Link to={`/orders/${order.id}`} key={order.id} style={{ textDecoration: 'none' }}>
              <div className="card" style={styles.orderCard}>
                <div>
                  <p style={styles.orderId}>Order #{order.id}</p>
                  <p style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</p>
                </div>
                <div style={styles.itemsPreview}>
                  {order.items?.slice(0, 3).map((item, i) => (
                    <span key={i} style={styles.itemChip}>{item.name}</span>
                  ))}
                  {order.items?.length > 3 && <span style={styles.itemChip}>+{order.items.length - 3} more</span>}
                </div>
                <div style={styles.orderRight}>
                  <span className={`badge ${STATUS_BADGE[order.status] || 'badge-info'}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <p style={styles.orderTotal}>${parseFloat(order.total_amount).toFixed(2)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  title:        { fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' },
  empty:        { textAlign: 'center', padding: '4rem', color: '#64748b' },
  orderCard:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap', transition: 'box-shadow .2s', cursor: 'pointer' },
  orderId:      { fontWeight: 700, color: '#1e293b' },
  orderDate:    { color: '#64748b', fontSize: '.85rem', marginTop: '.2rem' },
  itemsPreview: { display: 'flex', gap: '.4rem', flexWrap: 'wrap', flex: 1 },
  itemChip:     { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '.2rem .6rem', fontSize: '.78rem', color: '#475569' },
  orderRight:   { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.4rem' },
  orderTotal:   { fontWeight: 800, fontSize: '1.1rem', color: '#2563eb' },
};