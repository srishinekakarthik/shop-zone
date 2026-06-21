// src/pages/supplier/SupplierBulkImport.js
// Supplier uploads a CSV, we parse it client-side (no extra library —
// a hand-rolled parser is fine since this is a controlled, single-file
// upload, not arbitrary CSV from the open web), then POST the parsed
// rows to /api/supplier/bulk-import. The backend records a job and
// hands off to the n8n "Bulk Import" workflow (04_bulk_import.json),
// which validates rows again server-side and calls bulk_insert_products().
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supplierAPI } from '../../api/services';
import { toast } from 'react-toastify';
import Spinner from '../../components/common/Spinner';

const TEMPLATE_CSV = `name,description,price,stock,category_slug,image_url,reorder_threshold
Wireless Mouse,Ergonomic 2.4GHz wireless mouse,799,50,electronics,https://example.com/mouse.jpg,10
Cotton T-Shirt,100% cotton crew neck,499,120,clothing,https://example.com/tshirt.jpg,15`;

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).filter(Boolean).map(line => {
    // Simple split — sufficient for this controlled template (no embedded commas in quotes expected)
    const cells = line.split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

export default function SupplierBulkImport() {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs]       = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const loadJobs = () => {
    setLoadingJobs(true);
    supplierAPI.getBulkImportJobs().then(r => setJobs(r.data.jobs)).finally(() => setLoadingJobs(false));
  };
  useEffect(loadJobs, []);

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const rows = parseCsv(ev.target.result);
        setPreview(rows);
      } catch {
        toast.error('Could not parse that CSV file');
      }
    };
    reader.readAsText(f);
  };

  const handleSubmit = async () => {
    if (preview.length === 0) { toast.error('Upload a CSV file first'); return; }
    setSubmitting(true);
    try {
      const res = await supplierAPI.bulkImport(preview);
      toast.success(res.data.message || 'Import queued');
      setFile(null); setPreview([]);
      loadJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed to queue');
    } finally { setSubmitting(false); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'shopzone-bulk-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/supplier/products" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>← Back to Products</Link>
      </div>
      <h1 style={styles.title}>Bulk Import Products</h1>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Upload a CSV to add many products at once. Each row needs at minimum a <code>name</code> and <code>price</code>.
      </p>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input type="file" accept=".csv" onChange={handleFile} />
          <button className="btn btn-outline btn-sm" type="button" onClick={downloadTemplate}>Download CSV Template</button>
        </div>

        {preview.length > 0 && (
          <>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{preview.length} rows parsed from {file?.name}</p>
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table style={styles.table}>
                <thead><tr style={styles.thead}>
                  {Object.keys(preview[0]).map(h => <th key={h} style={styles.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} style={styles.tr}>
                      {Object.keys(preview[0]).map(h => <td key={h} style={styles.td}>{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 5 && <p style={{ color: '#94a3b8', fontSize: '.8rem', marginTop: 6 }}>…and {preview.length - 5} more rows</p>}
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Queuing import…' : `Import ${preview.length} Products`}
            </button>
          </>
        )}
      </div>

      <h3 style={styles.sectionTitle}>Recent Import Jobs</h3>
      {loadingJobs ? <Spinner /> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr style={styles.thead}>
              <th style={styles.th}>Job</th><th style={styles.th}>Status</th>
              <th style={styles.th}>Rows</th><th style={styles.th}>Succeeded</th>
              <th style={styles.th}>Failed</th><th style={styles.th}>Submitted</th>
            </tr></thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} style={styles.tr}>
                  <td style={styles.td}>#{j.id}</td>
                  <td style={styles.td}><span className={`badge ${j.status === 'completed' ? 'badge-success' : j.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{j.status}</span></td>
                  <td style={styles.td}>{j.rows_total}</td>
                  <td style={styles.td}>{j.rows_succeeded}</td>
                  <td style={styles.td}>{j.rows_failed}</td>
                  <td style={styles.td}>{new Date(j.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>No import jobs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  title:       { fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 },
  sectionTitle:{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: '1.5rem 0 .75rem' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' },
  thead:       { background: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  tr:          { borderBottom: '1px solid #f1f5f9' },
  th:          { padding: '.6rem .85rem', fontWeight: 700, textAlign: 'left', color: '#475569' },
  td:          { padding: '.6rem .85rem' },
};
