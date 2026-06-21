// src/pages/UnsubscribePage.js
// Public page — reached by clicking the unsubscribe link in a
// marketing email (n8n-workflows/05_new_product_marketing.json).
// The recipient is very likely signed out, so this page calls the
// PUBLIC GET /api/users/unsubscribe endpoint directly, not anything
// behind the auth-protected userAPI in services.js. The link's
// ?uid=&token= query string is itself the authorization — see
// verifyUnsubscribeToken in backend/controllers/userController.js.
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function UnsubscribePage() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading | success | error

    useEffect(() => {
        const uid = searchParams.get('uid');
        const token = searchParams.get('token');

        if (!uid || !token) { setStatus('error'); return; }

        axios.get(`${API_BASE}/users/unsubscribe`, { params: { uid, token } })
            .then(() => setStatus('success'))
            .catch(() => setStatus('error'));
    }, [searchParams]);

    return (
        <div style={s.page}>
            <div style={s.card}>
                {status === 'loading' && (
                    <>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
                        <p style={s.text}>Processing your request…</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                        <h2 style={s.title}>You're unsubscribed</h2>
                        <p style={s.text}>
                            You won't receive new-product marketing emails from ShopZone anymore.
                            You'll still get order confirmations and account-related emails.
                        </p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚠️</div>
                        <h2 style={s.title}>Link not valid</h2>
                        <p style={s.text}>
                            This unsubscribe link is invalid or has already been used. If you're still
                            receiving emails you don't want, you can turn this off anytime from your
                            account's profile page.
                        </p>
                    </>
                )}
                <Link to="/" style={s.link}>Return to ShopZone</Link>
            </div>
        </div>
    );
}

const s = {
    page: { minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
    card: { background: '#fff', borderRadius: 16, padding: '2.5rem', maxWidth: 440, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' },
    title: { fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: 10 },
    text: { color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' },
    link: { color: '#7c3aed', fontWeight: 700, textDecoration: 'none' },
};