// src/pages/HomePage.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productAPI, categoryAPI } from '../api/services';
import ProductCard from '../components/common/ProductCard';
import Spinner from '../components/common/Spinner';

export default function HomePage() {
  const [featured,    setFeatured]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      productAPI.getAll({ limit: 8 }),
      categoryAPI.getAll(),
    ]).then(([pRes, cRes]) => {
      setFeatured(pRes.data.products);
      setCategories(cRes.data.categories);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Hero */}
      <section style={styles.hero}>
        <div className="container" style={styles.heroInner}>
          <h1 style={styles.heroH1}>Everything you need,<br />delivered to your door.</h1>
          <p style={styles.heroSub}>Thousands of products at great prices.</p>
          <Link to="/products" className="btn btn-primary" style={{ fontSize: '1rem' }}>
            Shop Now →
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="container page">
        <h2 style={styles.sectionTitle}>Shop by Category</h2>
        <div style={styles.catGrid}>
          {categories.map(cat => (
            <Link key={cat.id} to={`/products?category=${cat.slug}`} style={styles.catCard}>
              <span style={styles.catIcon}>🏷</span>
              <span style={styles.catName}>{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container" style={{ paddingBottom: '3rem' }}>
        <h2 style={styles.sectionTitle}>Featured Products</h2>
        <div className="product-grid">
          {featured.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/products" className="btn btn-outline">View All Products</Link>
        </div>
      </section>
    </div>
  );
}

const styles = {
  hero:        { background: 'linear-gradient(135deg,#1e293b,#2563eb)', color: '#fff', padding: '5rem 0' },
  heroInner:   { display: 'flex', flexDirection: 'column', gap: '1rem' },
  heroH1:      { fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800, lineHeight: 1.2 },
  heroSub:     { fontSize: '1.15rem', color: '#bfdbfe', maxWidth: '500px' },
  sectionTitle:{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem', color: '#1e293b' },
  catGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' },
  catCard:     { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem', cursor: 'pointer', transition: 'border-color .2s' },
  catIcon:     { fontSize: '1.8rem' },
  catName:     { fontWeight: 600, fontSize: '.9rem', color: '#1e293b', textAlign: 'center' },
};