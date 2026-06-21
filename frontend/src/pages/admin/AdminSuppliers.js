// src/pages/admin/AdminSuppliers.js
// Approve/reject vendor applications. This is the gate that turns a
// 'pending' suppliers row into 'approved' — only after that does the
// supplier's own /api/supplier/* endpoints unlock (enforced by the
// supplierApprovedOnly middleware on the backend).
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api/services';
import { toast } from 'react-toastify';
import Spinner from '../../components/common/Spinner';

const TABS = ['pending', 'approved', 'rejected'];

export default function AdminSuppliers() {
  const [tab, setTab]           = useState('pending');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busyId, setBusyId]     = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason]     = useState('');

  const fetchSuppliers = (status) => {
    setLoading(true);
    adminAPI.getSuppliers(status).then(r => setSuppliers(r.data.suppliers)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchSuppliers(tab); }, [tab]);

  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      await adminAPI.approveSupplier(id);
      toast.success('Supplier approved');
      fetchSuppliers(tab);
    } catch { toast.error('Approve failed'); }
    finally { setBusyId(null); }
  };

  const handleReject = async (id) => {
    setBusyId(id);
    try {
      await adminAPI.rejectSupplier(id, reason);
      toast.info('Supplier application rejected');
      setRejectingId(null); setReason('');
      fetchSuppliers(tab);
    } catch { toast.error('Reject failed'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="container page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>← Back to Dashboard</Link>
      </div>
      <h1 style={styles.title}>Vendor / Supplier Applications</h1>

      <div style={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...styles.tabBtn, ...(tab === t ? styles.tabBtnActive : {}) }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div style={styles.list}>
          {suppliers.length === 0 && <p style={{ color: '#94a3b8' }}>No {tab} suppliers.</p>}
          {suppliers.map(s => (
            <div key={s.id} className="card" style={styles.row}>
              <div style={{ flex: 1 }}>
                <p style={styles.bizName}>{s.business_name}</p>
                <p style={styles.meta}>{s.email} {s.phone ? `· ${s.phone}` : ''}</p>
                {s.description && <p style={styles.desc}>{s.description}</p>}
                <p style={styles.meta}>Applied {new Date(s.created_at).toLocaleDateString()}</p>
                {s.rejected_reason && <p style={{ ...styles.meta, color: '#dc2626' }}>Reason: {s.rejected_reason}</p>}
              </div>

              {tab === 'pending' && (
                rejectingId === s.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                    <input
                      className="form-control" placeholder="Reason (optional)"
                      value={reason} onChange={e => setReason(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleReject(s.id)} disabled={busyId === s.id}>Confirm Reject</button>
                      <button className="btn btn-outline btn-sm" onClick={() => { setRejectingId(null); setReason(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleApprove(s.id)} disabled={busyId === s.id}>
                      {busyId === s.id ? 'Approving…' : 'Approve'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setRejectingId(s.id)}>Reject</button>
                  </div>
                )
              )}
              {tab === 'approved' && <span className="badge badge-success">Approved</span>}
              {tab === 'rejected' && <span className="badge badge-danger">Rejected</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  title:    { fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem' },
  tabs:     { display: 'flex', gap: 8, marginBottom: '1.25rem' },
  tabBtn:   { padding: '.5rem 1rem', borderRadius: 999, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem' },
  tabBtnActive: { background: '#7c3aed', borderColor: '#7c3aed', color: '#fff' },
  list:     { display: 'flex', flexDirection: 'column', gap: '.75rem' },
  row:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem' },
  bizName:  { fontWeight: 700, color: '#1e293b', margin: 0, fontSize: '1.05rem' },
  meta:     { fontSize: '.8rem', color: '#94a3b8', margin: '2px 0 0' },
  desc:     { fontSize: '.85rem', color: '#475569', margin: '6px 0 0' },
};
