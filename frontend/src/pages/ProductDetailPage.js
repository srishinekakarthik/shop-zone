// src/pages/ProductDetailPage.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../api/services';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function ProductDetailPage() {
  const { slug }     = useParams();
  const { user }     = useAuth();
  const { addItem }  = useCart();
  const navigate     = useNavigate();

  const [product,  setProduct]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [qty,      setQty]      = useState(1);
  const [adding,   setAdding]   = useState(false);

  useEffect(() => {
    setLoading(true);
    productAPI.getBySlug(slug)
      .then(res => setProduct(res.data.product))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return; }
    setAdding(true);
    try {
      await addItem(product.id, qty);
      toast.success(`"${product.name}" added to cart! 🛒`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to cart');
    } finally { setAdding(false); }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <div style={s.spinner} />
        <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <div style={{ fontSize: '3rem' }}>😕</div>
        <h2 style={{ fontWeight: 700, margin: '1rem 0 .5rem' }}>Product not found</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>This product may have been removed or doesn't exist.</p>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    );
  }

  const inStock = product.stock > 0;

  return (
    <div className="container page">
      {/* Breadcrumb */}
      <nav style={s.breadcrumb}>
        <Link to="/" style={s.breadLink}>Home</Link>
        <span style={s.sep}>›</span>
        <Link to="/products" style={s.breadLink}>Products</Link>
        <span style={s.sep}>›</span>
        <Link to={`/products?category=${product.category_slug}`} style={s.breadLink}>
          {product.category_name}
        </Link>
        <span style={s.sep}>›</span>
        <span style={{ color: '#1e293b' }}>{product.name}</span>
      </nav>

      <div style={s.layout}>
        {/* Image */}
        <div style={s.imageWrap}>
          <img
            src={product.image_url || `https://placehold.co/500x500/e2e8f0/64748b?text=${encodeURIComponent(product.name)}`}
            alt={product.name}
            style={s.image}
          />
          {!inStock && (
            <div style={s.outOfStockBadge}>Out of Stock</div>
          )}
        </div>

        {/* Details */}
        <div style={s.details}>
          {/* Category badge */}
          <Link
            to={`/products?category=${product.category_slug}`}
            style={s.categoryBadge}
          >
            {product.category_name}
          </Link>

          <h1 style={s.productName}>{product.name}</h1>

          <div style={s.priceRow}>
            <span style={s.price}>${parseFloat(product.price).toFixed(2)}</span>
            {inStock ? (
              <span style={s.stockBadge}>✓ In Stock ({product.stock})</span>
            ) : (
              <span style={{ ...s.stockBadge, background: '#fef2f2', color: '#dc2626' }}>✗ Out of Stock</span>
            )}
          </div>

          {product.description && (
            <div style={s.descSection}>
              <h3 style={s.descTitle}>Description</h3>
              <p style={s.desc}>{product.description}</p>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          {inStock && (
            <div style={s.actions}>
              <div style={s.qtyRow}>
                <span style={s.qtyLabel}>Quantity</span>
                <div style={s.qtyControl}>
                  <button
                    style={s.qtyBtn}
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >−</button>
                  <span style={s.qtyNum}>{qty}</span>
                  <button
                    style={s.qtyBtn}
                    onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                    disabled={qty >= product.stock}
                  >+</button>
                </div>
              </div>

              <button
                style={{ ...s.addBtn, opacity: adding ? 0.7 : 1 }}
                onClick={handleAddToCart}
                disabled={adding}
              >
                {adding ? 'Adding…' : '🛒 Add to Cart'}
              </button>

              <button
                style={s.buyNowBtn}
                onClick={async () => {
                  await handleAddToCart();
                  if (user) navigate('/cart');
                }}
                disabled={adding}
              >
                Buy Now →
              </button>
            </div>
          )}

          {/* Meta info */}
          <div style={s.meta}>
            <div style={s.metaRow}>
              <span style={s.metaLabel}>Category</span>
              <span>{product.category_name}</span>
            </div>
            <div style={s.metaRow}>
              <span style={s.metaLabel}>SKU</span>
              <span style={{ fontFamily: 'monospace', fontSize: '.85rem' }}>{product.slug}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  breadcrumb: { display: 'flex', gap: '.4rem', alignItems: 'center', marginBottom: '2rem', fontSize: '.875rem', flexWrap: 'wrap' },
  breadLink:  { color: '#2563eb', textDecoration: 'none' },
  sep:        { color: '#94a3b8' },
  layout:     { display: 'flex', gap: '3rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  imageWrap:  { flex: '0 0 auto', width: '100%', maxWidth: 460, position: 'relative' },
  image:      { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 16, background: '#f1f5f9' },
  outOfStockBadge: {
    position: 'absolute', top: 16, left: 16,
    background: 'rgba(220,38,38,0.9)', color: '#fff',
    padding: '.3rem .8rem', borderRadius: 8, fontWeight: 700, fontSize: '.85rem',
  },
  details:      { flex: 1, minWidth: 280 },
  categoryBadge: {
    display: 'inline-block',
    background: '#eff6ff', color: '#2563eb',
    padding: '.25rem .75rem', borderRadius: 999,
    fontSize: '.8rem', fontWeight: 700,
    textDecoration: 'none', marginBottom: '.75rem',
  },
  productName: { fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '.75rem', lineHeight: 1.25 },
  priceRow:    { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  price:       { fontSize: '2rem', fontWeight: 800, color: '#2563eb' },
  stockBadge:  { background: '#f0fdf4', color: '#16a34a', padding: '.3rem .75rem', borderRadius: 8, fontWeight: 700, fontSize: '.85rem' },
  descSection: { marginBottom: '1.5rem' },
  descTitle:   { fontWeight: 700, marginBottom: '.5rem', color: '#374151' },
  desc:        { color: '#64748b', lineHeight: 1.7, fontSize: '.95rem' },
  actions:     { display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1.5rem' },
  qtyRow:      { display: 'flex', alignItems: 'center', gap: '1rem' },
  qtyLabel:    { fontWeight: 600, color: '#374151', minWidth: 70 },
  qtyControl:  { display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' },
  qtyBtn:      { width: 38, height: 38, border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700, color: '#1e293b' },
  qtyNum:      { padding: '0 1rem', fontWeight: 700, fontSize: '1rem', minWidth: 30, textAlign: 'center' },
  addBtn: {
    padding: '0.9rem 1.5rem',
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  buyNowBtn: {
    padding: '0.9rem 1.5rem',
    background: '#0f172a',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
  },
  meta:      { borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.6rem' },
  metaRow:   { display: 'flex', gap: '1rem', fontSize: '.9rem', color: '#374151' },
  metaLabel: { fontWeight: 600, minWidth: 80, color: '#64748b' },
  spinner: {
    width: 40, height: 40, margin: '0 auto',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
