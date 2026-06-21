// src/pages/admin/AdminDashboard.js
// Redesigned around three tiers:
//   1. Business Overview   — revenue, orders, customers, suppliers (raw counts)
//   2. Customer Intelligence — sentiment score, review volume, complaint categories
//   3. AI Insights          — top issues, top praises, risk products
//
// Tiers 2 & 3 are populated entirely by data the n8n sentiment workflow
// (n8n-workflows/01_sentiment_analysis.json) writes into product_reviews
// (sentiment, urgency, complaint_category) — see GET /api/admin/intelligence
// in adminController.js for the aggregation. This is platform-wide,
// across every supplier; the supplier's own dashboard shows the same
// shape of data but scoped to just their own products.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api/services';
import Spinner from '../../components/common/Spinner';
import AssistantChat from '../../components/common/AssistantChat';

import customersSvg from '../../svg/customers.svg';
import productsSvg from '../../svg/products.svg';
import cartSvg from '../../svg/cart.svg';
import revenueSvg from '../../svg/revenue.svg';

const STATUS_BADGE = { pending: 'badge-warning', processing: 'badge-info', shipped: 'badge-info', delivered: 'badge-success', cancelled: 'badge-danger' };

const ADMIN_SUGGESTIONS = [
  'Which products are receiving the most complaints?',
  'Summarize customer feedback for our top-selling product',
  'What are the biggest customer issues this month?',
  'Which products are at risk of returns or refunds?',
];

function StatCard({ icon, label, value, color, link }) {
  const content = (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: link ? 'pointer' : 'default' }}>
      <div style={{ background: color + '20', borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '68px', height: '68px', boxSizing: 'border-box' }}>
        {icon}
      </div>
      <div>
        <p style={{ color: '#64748b', fontSize: '.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</p>
        <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  );
  return link ? <Link to={link} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

function MiniStatCard({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
      <p style={{ color: '#64748b', fontSize: '.8rem', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</p>
      <p style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 0', color }}>{value}</p>
    </div>
  );
}

function SectionLabel({ emoji, text }) {
  return (
    <div style={styles.sectionLabel}>
      <span>{emoji}</span> {text}
    </div>
  );
}

function InsightList({ title, items, type, emptyText }) {
  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.75rem' }}>{title}</h3>
      {(!items || items.length === 0) ? (
        <p style={{ color: '#94a3b8', fontSize: '.9rem' }}>{emptyText}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((it, idx) => (
            <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{it.product_name}</span>
                {it.supplier_name && <span style={{ color: '#94a3b8', fontSize: '.78rem', marginLeft: 6 }}>· {it.supplier_name}</span>}
              </div>
              <span style={{ fontSize: '.8rem', color: type === 'praise' ? '#16a34a' : '#dc2626' }}>
                {type === 'praise'
                  ? `score ${Number(it.avg_sentiment_score || 0).toFixed(2)}`
                  : `${it.negative_count || 0} negative${it.high_urgency_count ? `, ${it.high_urgency_count} urgent` : ''}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminAPI.getDashboard(), adminAPI.getIntelligence()])
      .then(([d, i]) => { setData(d.data); setIntelligence(i.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const sentiment = intelligence?.sentimentScore || {};
  const total = sentiment.totalReviews || 0;
  const posPct = total ? Math.round((sentiment.positive / total) * 100) : 0;
  const negPct = total ? Math.round((sentiment.negative / total) * 100) : 0;

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/products" className="btn btn-primary btn-sm">Manage Products</Link>
          <Link to="/admin/orders" className="btn btn-outline btn-sm">View Orders</Link>
          <Link to="/admin/users" className="btn btn-outline btn-sm">View Users</Link>
          <Link to="/admin/suppliers" className="btn btn-outline btn-sm">
            Suppliers {data.suppliers?.pending > 0 && <span className="badge badge-warning" style={{ marginLeft: 6 }}>{data.suppliers.pending} pending</span>}
          </Link>
        </div>
      </div>

      {/* ── Tier 1: Business Overview ── */}
      <SectionLabel emoji="" text="Business Overview" />
      <div style={styles.statsGrid}>
        <StatCard icon={<img src={customersSvg} alt="Customers" width="36" height="36" style={{ display: 'block' }} />} label="Customers" value={data.totalUsers} color="#2563eb" />
        <StatCard icon={<img src={productsSvg} alt="Products" width="36" height="36" style={{ display: 'block' }} />} label="Products" value={data.totalProducts} color="#7c3aed" />
        <StatCard icon={<img src={cartSvg} alt="Orders" width="36" height="36" style={{ display: 'block' }} />} label="Orders" value={data.totalOrders} color="#059669" />
        <StatCard icon={<img src={revenueSvg} alt="Revenue" width="36" height="36" style={{ display: 'block' }} />} label="Revenue" value={`₹${parseFloat(data.revenue).toLocaleString()}`} color="#f59e0b" />
      </div>
      <div style={{ ...styles.statsGrid, marginTop: '1rem' }}>
        <MiniStatCard label="Approved Suppliers" value={data.suppliers?.approved || 0} color="#16a34a" />
        <MiniStatCard label="Pending Applications" value={data.suppliers?.pending || 0} color={data.suppliers?.pending > 0 ? '#d97706' : '#64748b'} />
        <MiniStatCard label="Rejected" value={data.suppliers?.rejected || 0} color="#94a3b8" />
      </div>

      {/* ── Tier 2: Customer Intelligence ── */}
      <SectionLabel emoji="" text="Customer Intelligence" />
      <div style={styles.statsGrid}>
        <MiniStatCard label="Sentiment Score" value={sentiment.overallScore?.toFixed(2) ?? '—'} color="#0ea5e9" />
        <MiniStatCard label="Review Volume" value={intelligence?.reviewVolume || 0} color="#6366f1" />
        <MiniStatCard label="High Urgency Reviews" value={sentiment.highUrgency || 0} color={sentiment.highUrgency > 0 ? '#dc2626' : '#64748b'} />
      </div>

      {total > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', color: '#64748b', marginBottom: 8 }}>
            <span> {sentiment.positive} positive ({posPct}%)</span>
            <span> {sentiment.neutral} neutral</span>
            <span> {sentiment.negative} negative ({negPct}%)</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${posPct}%`, background: '#22c55e' }} />
            <div style={{ width: `${100 - posPct - negPct}%`, background: '#f59e0b' }} />
            <div style={{ width: `${negPct}%`, background: '#ef4444' }} />
          </div>
        </div>
      )}

      {intelligence?.complaintCategories?.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.75rem' }}>Complaint Categories</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {intelligence.complaintCategories.map(c => (
              <span key={c.complaint_category} style={styles.chip}>
                {c.complaint_category.replace(/_/g, ' ')} · {c.total}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Tier 3: AI Insights ── */}
      <SectionLabel emoji="" text="AI Insights" />
      <div style={styles.twoCol}>
        <InsightList title="Top Issues" emptyText="No issues flagged yet" items={intelligence?.topIssues} type="issue" />
        <InsightList title="Top Praises" emptyText="No praise data yet" items={intelligence?.topPraises} type="praise" />
      </div>
      <InsightList title=" Risk Products" emptyText="No risk products right now" items={intelligence?.riskProducts} type="risk" />

      {/* ── AI Assistant ── */}
      <SectionLabel emoji="" text="Ask Your AI Business Analyst" />
      <AssistantChat
        suggestions={ADMIN_SUGGESTIONS}
        placeholder="Ask about complaints, sentiment, or inventory across the platform…"
        storageKey="shopzone_admin_assistant_thread"
      />

      {/* Recent orders */}
      <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
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
                  <td style={{ fontWeight: 700, color: '#2563eb' }}>₹{parseFloat(o.total_amount)}</td>
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
  sectionLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '.95rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.04em', margin: '2rem 0 0.9rem' },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' },
  chip: { background: '#fef2f2', color: '#b91c1c', padding: '4px 10px', borderRadius: 999, fontSize: '.78rem', fontWeight: 600, textTransform: 'capitalize' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' },
  thead: { background: '#f8fafc' },
  tr: { borderBottom: '1px solid #f1f5f9' },
};
