// src/components/common/Spinner.js
import React from 'react';
export default function Spinner({ size = 40 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div style={{
        width: size, height: size, border: '4px solid #e2e8f0',
        borderTopColor: '#2563eb', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}