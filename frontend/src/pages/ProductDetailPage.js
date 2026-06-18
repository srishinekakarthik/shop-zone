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

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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
      toast.success(`"${product.name}" added to cart.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to cart');
    } finally { setAdding(false); }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to leave a review.');
      navigate('/login');
      return;
    }
    if (!reviewTitle.trim() || !reviewBody.trim()) {
      toast.error('Please fill out the review title and body.');
      return;
    }
    setSubmittingReview(true);
    try {
      await productAPI.addReview(product.id, {
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
      });
      toast.success('Thank you! Your review has been submitted.');
      setReviewTitle('');
      setReviewBody('');
      setReviewRating(5);
      
      // Refresh the product to fetch the new review
      const res = await productAPI.getBySlug(slug);
      setProduct(res.data.product);
      
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not submit review');
    } finally {
      setSubmittingReview(false);
    }
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
        <h2 style={{ fontWeight: 700, margin: '1rem 0 .5rem' }}>Product not found</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>This product may have been removed or doesn't exist.</p>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    );
  }

  const inStock = product.stock > 0;
  const averageRating = product.reviews && product.reviews.length > 0 
    ? (product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length).toFixed(1) 
    : null;

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
            {averageRating && (
              <span style={{ color: '#eab308', fontWeight: 700, fontSize: '1.1rem', marginLeft: '.5rem' }}>
                ★ {averageRating} <span style={{ color: '#64748b', fontSize: '.9rem', fontWeight: 400 }}>({product.reviews.length})</span>
              </span>
            )}
            {inStock ? (
              <span style={s.stockBadge}>In Stock ({product.stock})</span>
            ) : (
              <span style={{ ...s.stockBadge, background: '#fef2f2', color: '#dc2626' }}>Out of Stock</span>
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
                {adding ? 'Adding...' : 'Add to Cart'}
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

      {/* Review Section */}
      <div style={s.reviewSection}>
        <h2 style={s.reviewSectionTitle}>Customer Reviews</h2>
        
        <div style={s.reviewLayout}>
          <div style={s.reviewsList}>
            {product.reviews && product.reviews.length > 0 ? (
              product.reviews.map(review => (
                <div key={review.id} style={s.reviewItem}>
                  <div style={s.reviewHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <div style={s.avatarPlaceholder}>
                        {review.user_name ? review.user_name.charAt(0).toUpperCase() : 'V'}
                      </div>
                      <span style={s.reviewAuthor}>{review.user_name || 'Verified Customer'}</span>
                    </div>
                    <span style={s.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ marginBottom: '.5rem' }}>
                    <span style={s.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  <h4 style={s.reviewTitleDisplay}>{review.title}</h4>
                  <p style={s.reviewBodyDisplay}>{review.body}</p>
                </div>
              ))
            ) : (
              <div style={s.noReviews}>
                <p>No reviews yet. Be the first to share your thoughts!</p>
              </div>
            )}
          </div>

          <div style={s.reviewFormCard}>
            <h3 style={s.reviewFormTitle}>Write a Review</h3>
            <form onSubmit={handleReviewSubmit} style={s.reviewForm}>
              <div style={s.formGroup}>
                <label style={s.label}>Rating</label>
                <select 
                  style={s.select} 
                  value={reviewRating} 
                  onChange={e => setReviewRating(Number(e.target.value))}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Average</option>
                  <option value={2}>2 - Poor</option>
                  <option value={1}>1 - Terrible</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Title</label>
                <input
                  style={s.input}
                  placeholder="Brief summary of your review"
                  value={reviewTitle}
                  onChange={e => setReviewTitle(e.target.value)}
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Review</label>
                <textarea
                  style={s.textarea}
                  placeholder="What did you like or dislike?"
                  rows={4}
                  value={reviewBody}
                  onChange={e => setReviewBody(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                style={{ ...s.submitBtn, opacity: submittingReview ? 0.7 : 1 }}
                disabled={submittingReview}
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
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
    background: '#2563eb',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
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
  reviewSection: { marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0' },
  reviewSectionTitle: { fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#0f172a' },
  reviewFormCard: { background: '#f8fafc', padding: '1.5rem', borderRadius: 16, border: '1px solid #e2e8f0', maxWidth: 600 },
  reviewFormTitle: { fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' },
  reviewForm: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '.4rem' },
  label: { fontSize: '.85rem', fontWeight: 600, color: '#475569' },
  input: { padding: '.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '.95rem', outline: 'none' },
  select: { padding: '.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '.95rem', outline: 'none', background: '#fff' },
  textarea: { padding: '.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '.95rem', outline: 'none', resize: 'vertical' },
  submitBtn: {
    padding: '.75rem 1.5rem', background: '#0f172a', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: '.95rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start'
  },
  reviewLayout: { display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' },
  reviewsList: { flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  reviewItem: { padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.9rem' },
  reviewAuthor: { fontWeight: 600, color: '#0f172a', fontSize: '.95rem' },
  reviewStars: { color: '#eab308', letterSpacing: '2px', fontSize: '1.1rem' },
  reviewDate: { fontSize: '.85rem', color: '#94a3b8' },
  reviewTitleDisplay: { fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem', color: '#1e293b' },
  reviewBodyDisplay: { fontSize: '.95rem', color: '#475569', lineHeight: 1.5 },
  noReviews: { padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: 12, color: '#64748b', border: '1px dashed #cbd5e1' }
};
