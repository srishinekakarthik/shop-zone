// src/pages/supplier/SupplierPendingPage.js
// Shown instead of the supplier dashboard whenever the logged-in
// supplier's status isn't 'approved' yet. Reads status straight off
// AuthContext's user object (populated from GET /api/auth/me).
import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function SupplierPendingPage() {
  const { user } = useAuth();
  const status = user?.supplierStatus || 'pending';
  const isRejected = status === 'rejected';

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>{isRejected ? '' : ''}</div>
        <h2 style={s.title}>
          {isRejected ? 'Application Not Approved' : 'Your Vendor Account Is Pending Approval'}
        </h2>
        <p style={s.body}>
          {isRejected
            ? (user?.supplierRejectedReason || 'Your application to sell on ShopZone was not approved.')
            : `Thanks for applying${user?.supplierBusinessName ? `, ${user.supplierBusinessName}` : ''}! A ShopZone admin is reviewing your vendor application. You'll be able to add products and access your dashboard as soon as you're approved.`}
        </p>
        {!isRejected && (
          <div style={s.statusBadge}>
            <span style={s.dot}/> Status: Pending Review
          </div>
        )}
        <p style={s.helper}>
          Questions? Reach out to <a href="mailto:support@shopzone.in" style={s.link}>support@shopzone.in</a>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  card: { background: '#fff', borderRadius: 20, padding: '3rem 2.5rem', maxWidth: 480, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' },
  title: { fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: 10 },
  body: { color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: 999, padding: '.5rem 1rem', fontSize: '.85rem', fontWeight: 700 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block', animation: 'pulse 1.5s infinite' },
  helper: { color: '#94a3b8', fontSize: '.85rem', marginTop: '1.5rem', marginBottom: 0 },
  link: { color: '#7c3aed', fontWeight: 600 },
};
