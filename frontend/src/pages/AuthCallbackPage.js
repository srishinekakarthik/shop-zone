// src/pages/AuthCallbackPage.js
// Handles the redirect after OAuth login, magic link clicks, and email confirmation.
// IMPORTANT: After an OAuth redirect, Supabase needs onAuthStateChange to fire
// (it exchanges the URL code for a session asynchronously).
// We listen for the event rather than calling getSession() immediately.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../api/axios';

export default function AuthCallbackPage() {
  const navigate        = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    // Listen for Supabase to finish exchanging the OAuth code / magic link token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Sync OAuth profile metadata (name, avatar) to our profiles table
          const meta = session.user.user_metadata;
          if (meta?.name || meta?.full_name || meta?.avatar_url || meta?.picture) {
            try {
              await api.post('/auth/sync-profile', {
                name:       meta.name || meta.full_name,
                avatar_url: meta.avatar_url || meta.picture,
              });
            } catch {
              // Non-critical — profile row was already created by DB trigger
            }
          }

          // Redirect: admin → /admin, everyone else → /
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          subscription.unsubscribe();
          navigate(profile?.role === 'admin' ? '/admin' : '/', { replace: true });

        } else if (event === 'USER_UPDATED' && session) {
          // Password reset confirmation
          subscription.unsubscribe();
          navigate('/', { replace: true });

        } else if (event === 'SIGNED_OUT') {
          subscription.unsubscribe();
          navigate('/login', { replace: true });
        }
      }
    );

    // Also check if a session already exists (e.g. page refresh mid-flow)
    supabase.auth.getSession().then(async ({ data: { session }, error: err }) => {
      if (err) {
        setError(err.message);
        return;
      }
      if (session) {
        // Session already established — redirect immediately
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        subscription.unsubscribe();
        navigate(profile?.role === 'admin' ? '/admin' : '/', { replace: true });
      }
      // If no session, wait for onAuthStateChange above to fire
    });

    // Safety fallback: if nothing fires after 10s, go to login
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      navigate('/login', { replace: true });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}>
      {error ? (
        <>
          <div style={{ fontSize: '2.5rem' }}></div>
          <h2 style={{ color: '#dc2626', fontWeight: 700 }}>Authentication failed</h2>
          <p style={{ color: '#64748b' }}>{error}</p>
          <a href="/login" style={{ color: '#2563eb', fontWeight: 600 }}>Back to Sign In</a>
        </>
      ) : (
        <>
          <div style={{
            width: 48, height: 48,
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <h2 style={{ fontWeight: 700, color: '#1e293b' }}>Completing sign in…</h2>
          <p style={{ color: '#64748b' }}>Please wait while we set up your session.</p>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
