// src/pages/supplier/SupplierRestockAlerts.js
// Read-only view of restock_alerts rows written by the n8n
// "Restock Alerts" workflow (n8n-workflows/03_restock_alerts.json).
// Alerts auto-resolve (handled by a DB trigger) once the supplier
// raises stock back above their reorder_threshold via the product
// edit form or a bulk import.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supplierAPI } from '../../api/services';
import Spinner from '../../components/common/Spinner';

export default function SupplierRestockAlerts() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierAPI.getRestockAlerts().then(r => setAlerts(r.data.alerts)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const open = alerts.filter(a => a.status === 'open');
  const resolved = alerts.filter(a => a.status === 'resolved');

  return (
    <div className="container page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/supplier" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>← Back to Dashboard</Link>
      </div>
      <h1 style={styles.title}>Restock Alerts</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Triggered automatically by our inventory monitor every 30 minutes. Update your stock from the
        {' '}<Link to="/supplier/products" style={{ color: '#7c3aed', fontWeight: 600 }}>Products page</Link> to resolve an alert.
      </p>

      <h3 style={styles.sectionTitle}>Open ({open.length})</h3>
      <div style={styles.list}>
        {open.length === 0 && <p style={styles.empty}>No open restock alerts. </p>}
        {open.map(a => (
          <div key={a.id} className="card" style={styles.row}>
            <img src={a.products?.image_url || 'https://placehold.co/48x48?text=?'} alt="" style={styles.thumb} />
            <div style={{ flex: 1 }}>
              <p style={styles.productName}>{a.products?.name}</p>
              <p style={styles.meta}>Stock was {a.stock_at_alert} (threshold {a.threshold}) · {new Date(a.notified_at).toLocaleString()}</p>
            </div>
            <span className="badge badge-danger">Open</span>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <>
          <h3 style={{ ...styles.sectionTitle, marginTop: '2rem' }}>Resolved ({resolved.length})</h3>
          <div style={styles.list}>
            {resolved.map(a => (
              <div key={a.id} className="card" style={{ ...styles.row, opacity: 0.7 }}>
                <img src={a.products?.image_url || 'https://placehold.co/48x48?text=?'} alt="" style={styles.thumb} />
                <div style={{ flex: 1 }}>
                  <p style={styles.productName}>{a.products?.name}</p>
                  <p style={styles.meta}>Resolved {a.resolved_at ? new Date(a.resolved_at).toLocaleString() : ''}</p>
                </div>
                <span className="badge badge-success">Resolved</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  title:       { fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 },
  sectionTitle:{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '.75rem' },
  list:        { display: 'flex', flexDirection: 'column', gap: '.6rem' },
  row:         { display: 'flex', alignItems: 'center', gap: '1rem', padding: '.85rem 1.1rem' },
  thumb:       { width: 48, height: 48, objectFit: 'cover', borderRadius: 8 },
  productName: { fontWeight: 600, color: '#1e293b', margin: 0 },
  meta:        { fontSize: '.8rem', color: '#94a3b8', margin: '2px 0 0' },
  empty:       { color: '#94a3b8', fontSize: '.9rem' },
};
