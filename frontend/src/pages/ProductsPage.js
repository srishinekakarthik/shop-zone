// src/pages/ProductsPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productAPI, categoryAPI } from '../api/services';
import ProductCard from '../components/common/ProductCard';
import Spinner from '../components/common/Spinner';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [pagination,  setPagination]  = useState({});
  const [loading,     setLoading]     = useState(true);

  // Derive filter state from URL params (shareable URLs)
  const search   = searchParams.get('search')   || '';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const page     = searchParams.get('page')     || 1;

  const fetchProducts = useCallback(() => {
    setLoading(true);
    productAPI.getAll({ search, category, minPrice, maxPrice, page, limit: 12 })
      .then(res => {
        setProducts(res.data.products);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [search, category, minPrice, maxPrice, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { categoryAPI.getAll().then(r => setCategories(r.data.categories)); }, []);

  const setParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    next.delete('page'); // reset page on filter change
    setSearchParams(next);
  };

  return (
    <div className="container page">
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>All Products</h1>

      {/* Filters bar */}
      <div style={styles.filters}>
        <input
          className="form-control" placeholder="Search products…"
          value={search}
          onChange={e => setParam('search', e.target.value)}
          style={{ flex: 2 }}
        />
        <select className="form-control" value={category} onChange={e => setParam('category', e.target.value)} style={{ flex: 1 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <input className="form-control" placeholder="Min $" type="number" value={minPrice} onChange={e => setParam('minPrice', e.target.value)} style={{ width: 90 }} />
        <input className="form-control" placeholder="Max $" type="number" value={maxPrice} onChange={e => setParam('maxPrice', e.target.value)} style={{ width: 90 }} />
      </div>

      {loading ? <Spinner /> : (
        <>
          {products.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', marginTop: '3rem' }}>No products found.</p>
          ) : (
            <div className="product-grid">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={styles.pagination}>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setParam('page', p)}
                  className="btn btn-sm"
                  style={{ background: Number(page) === p ? '#2563eb' : '#e2e8f0', color: Number(page) === p ? '#fff' : '#1e293b' }}
                >{p}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  filters:    { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' },
  pagination: { display: 'flex', justifyContent: 'center', gap: '.5rem', marginTop: '2rem' },
};