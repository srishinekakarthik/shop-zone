// src/context/AuthContext.js
// Supabase Auth replaces the old bcrypt+JWT approach.
// We listen to onAuthStateChange for real-time session sync
// (handles email/password, OAuth redirects, magic links, and token refresh automatically).
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch extended profile (name, role, phone) from our profiles table
  const fetchProfile = useCallback(async (supabaseUser) => {
    if (!supabaseUser) { setUser(null); return; }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      // Fallback: use basic Supabase user info if backend isn't reachable
      setUser({
        id:    supabaseUser.id,
        email: supabaseUser.email,
        name:  supabaseUser.user_metadata?.name || supabaseUser.email,
        role:  'customer',
      });
    }
  }, []);

  useEffect(() => {
    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      fetchProfile(s?.user).finally(() => setLoading(false));
    });

    // Subscribe to session changes (login, logout, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        await fetchProfile(s?.user);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Auth actions ─────────────────────────────────────────────

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, name, extra = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, ...extra },   // stored in raw_user_meta_data, trigger copies to profiles/suppliers
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signInWithMagicLink = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      session, user, loading,
      signIn, signUp, signOut,
      signInWithGoogle, signInWithMagicLink,
      resetPassword,
      // Legacy aliases so existing components keep working
      login:  signIn,
      logout: signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);