// src/components/common/ProductCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { user }    = useAuth();

  const handleAddToCart = async (e) => {
    e.preventDefault(); // don't navigate
    if (!user) { toast.info('Please login to add items to cart'); return; }
    try {
      await addItem(product.id, 1);
      toast.success(`"${product.name}" added to cart!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to cart');
    }
  };

  return (
    <Link to={`/products/${product.slug}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={styles.card}>
        <img
          src={product.image_url || 'https://placehold.co/300x200?text=No+Image'}
          alt={product.name}
          style={styles.img}
        />
        <div style={styles.body}>
          <p style={styles.category}>{product.category_name}</p>
          <h3 style={styles.name}>{product.name}</h3>
          <div style={styles.footer}>
            <span style={styles.price}>${parseFloat(product.price).toFixed(2)}</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

const styles = {
  card:     { cursor: 'pointer', transition: 'transform .2s, box-shadow .2s', height: '100%' },
  img:      { width: '100%', height: '180px', objectFit: 'cover' },
  body:     { padding: '1rem' },
  category: { fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '.25rem' },
  name:     { fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '.75rem', lineHeight: 1.3 },
  footer:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  price:    { fontWeight: 800, fontSize: '1.1rem', color: '#2563eb' },
};