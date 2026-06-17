// src/pages/admin/AdminDashboard.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api/services';
import Spinner from '../../components/common/Spinner';

const STATUS_BADGE = { pending:'badge-warning', processing:'badge-info', shipped:'badge-info', delivered:'badge-success', cancelled:'badge-danger' };

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '2.2rem', background: color + '20', borderRadius: 12, padding: '.75rem', lineHeight: 1 }}>{icon}</div>
      <div>
        <p style={{ color: '#64748b', fontSize: '.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</p>
        <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/products" className="btn btn-primary btn-sm">Manage Products</Link>
          <Link to="/admin/orders"   className="btn btn-outline btn-sm">View Orders</Link>
          <Link to="/admin/users"    className="btn btn-outline btn-sm">View Users</Link>
        </div>
      </div>

      {/* Stats grid */}
      <div style={styles.statsGrid}>
        <StatCard icon="👥" label="Customers"  value={data.totalUsers}    color="#2563eb" />
        <StatCard icon="📦" label="Products"   value={data.totalProducts} color="#7c3aed" />
        <StatCard icon="🛒" label="Orders"     value={data.totalOrders}   color="#059669" />
        <StatCard icon="💰" label="Revenue"    value={`$${parseFloat(data.revenue).toFixed(2)}`} color="#f59e0b" />
      </div>

      {/* Recent orders */}
      <div className="card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1.1rem' }}>Recent Orders</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map(o => (
                <tr key={o.id} style={styles.tr}>
                  <td style={{ fontWeight: 600 }}>#{o.id}</td>
                  <td>{o.customer}</td>
                  <td style={{ fontWeight: 700, color: '#2563eb' }}>${parseFloat(o.total_amount).toFixed(2)}</td>
                  <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-info'}`}>{o.status}</span></td>
                  <td style={{ color: '#64748b', fontSize: '.85rem' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/admin/orders" style={{ display: 'inline-block', marginTop: '1rem', color: '#2563eb', fontWeight: 600, fontSize: '.9rem' }}>
          View all orders →
        </Link>
      </div>
    </div>
  );
}

const styles = {
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' },
  thead:     { background: '#f8fafc' },
  tr:        { borderBottom: '1px solid #f1f5f9' },
};

// Add <th> and <td> base styles via inline on each cell above (already done)