// src/pages/supplier/SupplierDashboard.js
// Mirrors the redesigned AdminDashboard.js three-tier layout
// (Business Overview / Customer Intelligence / AI Insights) but every
// number here comes from supplier-scoped endpoints (/api/supplier/*),
// which filter by supplier_id server-side — this vendor can never see
// another vendor's data, even by tampering with the request.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supplierAPI } from '../../api/services';
import Spinner from '../../components/common/Spinner';
import SupplierAssistant from '../../components/supplier/SupplierAssistant';

export default function SupplierDashboard() {
  const [overview, setOverview] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([supplierAPI.getDashboard(), supplierAPI.getIntelligence()])
      .then(([d, i]) => { setOverview(d.data); setIntelligence(i.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const sentiment = intelligence?.sentimentScore || {};
  const total = sentiment.totalReviews || 0;
  const posPct = total ? Math.round((sentiment.positive / total) * 100) : 0;
  const negPct = total ? Math.round((sentiment.negative / total) * 100) : 0;

  return (
    <div className="container page">
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Vendor Dashboard</h1>
          <p style={styles.subtitle}>Your store's performance at a glance</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/supplier/products" className="btn btn-secondary">Manage Products</Link>
          <Link to="/supplier/products/new" className="btn btn-primary">+ Add Product</Link>
        </div>
      </div>

      {/* Business Overview */}
      <SectionLabel emoji="" text="Business Overview" />
      <div style={styles.statGrid}>
        <StatCard label="Revenue" value={`₹${(overview.revenue || 0).toLocaleString()}`} color="#16a34a" />
        <StatCard label="Units Sold" value={overview.unitsSold || 0} color="#2563eb" />
        <StatCard label="Active Products" value={overview.totalProducts || 0} color="#7c3aed" />
        <StatCard
          label="Low Stock"
          value={overview.lowStockCount || 0}
          color={overview.lowStockCount > 0 ? '#dc2626' : '#64748b'}
          link={overview.lowStockCount > 0 ? '/supplier/restock-alerts' : null}
        />
      </div>

      {/* Customer Intelligence */}
      <SectionLabel emoji="" text="Customer Intelligence" />
      <div style={styles.statGrid}>
        <StatCard label="Sentiment Score" value={sentiment.overallScore?.toFixed(2) ?? '—'} color="#0ea5e9" />
        <StatCard label="Review Volume" value={intelligence?.reviewVolume || 0} color="#6366f1" />
        <StatCard label="High Urgency" value={sentiment.highUrgency || 0} color={sentiment.highUrgency > 0 ? '#dc2626' : '#64748b'} />
      </div>

      {total > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
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
          <h3 style={styles.cardTitle}>Complaint Categories</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {intelligence.complaintCategories.map(c => (
              <span key={c.complaint_category} style={styles.chip}>
                {c.complaint_category.replace(/_/g, ' ')} · {c.total}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      <SectionLabel emoji="" text="AI Insights" />
      <div style={styles.twoCol}>
        <InsightList title="Top Issues" emptyText="No issues flagged yet" items={intelligence?.topIssues} type="issue" />
        <InsightList title="Top Praises" emptyText="No praise data yet" items={intelligence?.topPraises} type="praise" />
      </div>
      <InsightList title="Risk Products" emptyText="No risk products right now" items={intelligence?.riskProducts} type="risk" full />

      {/* AI Assistant */}
      <SectionLabel emoji="" text="Ask Your AI Assistant" />
      <SupplierAssistant />
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

function StatCard({ label, value, color, link }) {
  const content = (
    <div className="card" style={{ ...styles.statCard, cursor: link ? 'pointer' : 'default' }}>
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, color }}>{value}</p>
    </div>
  );
  return link ? <Link to={link} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

function InsightList({ title, items, type, emptyText, full }) {
  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', ...(full ? {} : {}) }}>
      <h3 style={styles.cardTitle}>{title}</h3>
      {(!items || items.length === 0) ? (
        <p style={{ color: '#94a3b8', fontSize: '.9rem' }}>{emptyText}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((it, idx) => (
            <li key={idx} style={styles.insightRow}>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{it.product_name}</span>
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

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' },
  title: { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  subtitle: { color: '#64748b', margin: '4px 0 0' },
  sectionLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '.95rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.04em', margin: '1.75rem 0 0.9rem' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { padding: '1.1rem 1.25rem' },
  statLabel: { color: '#64748b', fontSize: '.8rem', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '.03em' },
  statValue: { fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 0' },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.75rem' },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' },
  insightRow: { display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid #f1f5f9' },
  chip: { background: '#fef2f2', color: '#b91c1c', padding: '4px 10px', borderRadius: 999, fontSize: '.78rem', fontWeight: 600, textTransform: 'capitalize' },
};
