// src/components/common/Footer.js
import React from 'react';
export default function Footer() {
  return (
    <footer style={{ background: '#1e293b', color: '#94a3b8', textAlign: 'center', padding: '1.5rem', marginTop: '4rem', fontSize: '.9rem' }}>
      © {new Date().getFullYear()} ShopZone. All rights reserved.
    </footer>
  );
}