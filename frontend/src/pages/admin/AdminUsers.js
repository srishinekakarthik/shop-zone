// src/pages/admin/AdminUsers.js
import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../api/services';
import Spinner from '../../components/common/Spinner';

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    adminAPI.getUsers().then(r => setUsers(r.data.users)).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  return (
    <div className="container page">
      <div style={styles.header}>
        <h1 style={styles.title}>Users ({users.length})</h1>
        <input
          className="form-control" style={{ width: 260 }}
          placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={styles.tr}>
                <td style={{ ...styles.td, color: '#94a3b8' }}>#{u.id}</td>
                <td style={{ ...styles.td, fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <div style={styles.avatar}>{u.name.charAt(0).toUpperCase()}</div>
                    {u.name}
                  </div>
                </td>
                <td style={{ ...styles.td, color: '#64748b' }}>{u.email}</td>
                <td style={styles.td}>
                  <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                    {u.role}
                  </span>
                </td>
                <td style={{ ...styles.td, color: '#64748b', fontSize: '.85rem' }}>
                  {new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No users found.</p>}
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  title:  { fontSize: '1.5rem', fontWeight: 700 },
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' },
  thead:  { background: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  tr:     { borderBottom: '1px solid #f1f5f9' },
  th:     { padding: '.75rem 1rem', fontWeight: 700, textAlign: 'left', color: '#475569' },
  td:     { padding: '.75rem 1rem' },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.85rem', fontWeight: 700, flexShrink: 0 },
};