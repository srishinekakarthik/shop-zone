// src/pages/supplier/SupplierOrders.js
// Shows only the order LINE ITEMS that belong to this supplier's
// products — pulled from v_supplier_order_items (see
// database/migrations_marketplace.sql), which is pre-filtered by
// supplier_id. Even if a customer's order also contains other
// suppliers' items, this supplier only ever sees their own rows.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supplierAPI } from '../../api/services';
import Spinner from '../../components/common/Spinner';

const STATUS_BADGE = { pending: 'badge-warning', processing: 'badge-info', shipped: 'badge-info', delivered: 'badge-success', cancelled: 'badge-danger' };

export default function SupplierOrders() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierAPI.getOrders().then(r => setItems(r.data.orderItems)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="container page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/supplier" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>← Back to Dashboard</Link>
      </div>
      <h1 style={styles.title}>My Orders ({items.length})</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Only line items from your own products are shown, even when a customer's order also includes other vendors' items.
      </p>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Order #</th>
              <th style={styles.th}>Product</th>
              <th style={styles.th}>Qty</th>
              <th style={styles.th}>Unit Price</th>
              <th style={styles.th}>Line Total</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.order_item_id} style={styles.tr}>
                <td style={styles.td}>#{it.order_id}</td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{it.product_name}</td>
                <td style={styles.td}>{it.quantity}</td>
                <td style={styles.td}>₹{parseFloat(it.unit_price).toFixed(2)}</td>
                <td style={styles.td}>₹{parseFloat(it.line_total).toFixed(2)}</td>
                <td style={styles.td}><span className={`badge ${STATUS_BADGE[it.order_status] || 'badge-info'}`}>{it.order_status}</span></td>
                <td style={styles.td}>{new Date(it.order_date).toLocaleDateString()}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  title:  { fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 },
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' },
  thead:  { background: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  tr:     { borderBottom: '1px solid #f1f5f9' },
  th:     { padding: '.75rem 1rem', fontWeight: 700, textAlign: 'left', color: '#475569' },
  td:     { padding: '.75rem 1rem' },
};
