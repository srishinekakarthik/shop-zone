// src/pages/admin/AdminOrders.js
import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../api/services';
import { toast } from 'react-toastify';
import Spinner from '../../components/common/Spinner';

const STATUSES   = ['pending','processing','shipped','delivered','cancelled'];
const STATUS_BADGE = { pending:'badge-warning', processing:'badge-info', shipped:'badge-info', delivered:'badge-success', cancelled:'badge-danger' };

export default function AdminOrders() {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('');
  const [updating,   setUpdating]   = useState(null); // order id being updated

  const fetchOrders = (status = '') => {
    setLoading(true);
    adminAPI.getOrders(status ? { status } : {})
      .then(r => setOrders(r.data.orders))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(filter); }, [filter]);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await adminAPI.updateOrderStatus(id, status);
      toast.success(`Order #${id} → ${status}`);
      fetchOrders(filter);
    } catch { toast.error('Update failed'); }
    finally { setUpdating(null); }
  };

  return (
    <div className="container page">
      <div style={styles.header}>
        <h1 style={styles.title}>All Orders</h1>
        <select
          className="form-control" style={{ width: 180 }}
          value={filter} onChange={e => setFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>Order</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Payment</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>#{o.id}</td>
                  <td style={styles.td}>{o.customer}</td>
                  <td style={{ ...styles.td, color: '#64748b', fontSize: '.85rem' }}>{o.email}</td>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#2563eb' }}>${parseFloat(o.total_amount).toFixed(2)}</td>
                  <td style={styles.td}>
                    <span className={`badge ${o.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{o.payment_status}</span>
                  </td>
                  <td style={styles.td}>
                    <span className={`badge ${STATUS_BADGE[o.status] || 'badge-info'}`}>{o.status}</span>
                  </td>
                  <td style={{ ...styles.td, color: '#64748b', fontSize: '.85rem' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <select
                      className="form-control"
                      style={{ padding: '.3rem .5rem', fontSize: '.85rem', width: 130 }}
                      value={o.status}
                      disabled={updating === o.id}
                      onChange={e => handleStatusChange(o.id, e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No orders found.</p>}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  title:  { fontSize: '1.5rem', fontWeight: 700 },
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' },
  thead:  { background: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  tr:     { borderBottom: '1px solid #f1f5f9' },
  th:     { padding: '.75rem 1rem', fontWeight: 700, textAlign: 'left', color: '#475569', whiteSpace: 'nowrap' },
  td:     { padding: '.75rem 1rem' },
};