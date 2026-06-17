// src/pages/ProfilePage.js
import React, { useEffect, useState } from 'react';
import { userAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile]   = useState({ name: '', email: '', phone: '', avatar_url: '' });
  const [pwForm,  setPwForm]    = useState({ newPassword: '', confirm: '' });
  const [tab,     setTab]       = useState('profile');
  const [saving,  setSaving]    = useState(false);

  useEffect(() => {
    userAPI.getProfile().then(r => {
      const u = r.data.user;
      setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '', avatar_url: u.avatar_url || '' });
    });
  }, []);

  const handleProfileSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await userAPI.updateProfile({ name: profile.name, phone: profile.phone, avatar_url: profile.avatar_url });
      toast.success('Profile updated!');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const handlePasswordSave = async e => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await userAPI.changePassword({ newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="container page" style={{ maxWidth: 680 }}>
      <h1 style={styles.title}>My Profile</h1>

      {/* Avatar banner */}
      <div className="card" style={styles.banner}>
        <div style={styles.avatar}>{profile.name?.charAt(0).toUpperCase() || '?'}</div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{profile.name}</p>
          <p style={{ color: '#64748b', fontSize: '.9rem' }}>{profile.email}</p>
          <span style={{ background: authUser?.role === 'admin' ? '#fef9c3' : '#dbeafe', color: authUser?.role === 'admin' ? '#ca8a04' : '#2563eb', borderRadius: '999px', padding: '.15rem .6rem', fontSize: '.75rem', fontWeight: 700 }}>
            {authUser?.role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['profile', 'password'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}>
            {t === 'profile' ? '👤 Profile Info' : '🔒 Change Password'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label>Full Name</label>
              <input className="form-control" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Email <span style={{ color: '#94a3b8', fontSize: '.8rem' }}>(cannot be changed)</span></label>
              <input className="form-control" value={profile.email} disabled style={{ background: '#f8fafc' }} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-control" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000" />
            </div>
            <div className="form-group">
              <label>Avatar URL</label>
              <input className="form-control" value={profile.avatar_url} onChange={e => setProfile(p => ({ ...p, avatar_url: e.target.value }))} placeholder="https://…" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
        </div>
      )}

      {tab === 'password' && (
        <div className="card" style={{ padding: '2rem' }}>
          <p style={{ color: '#64748b', fontSize: '.9rem', marginBottom: '1.25rem' }}>
            If you signed in with Google, you may set a password here to also enable email/password login.
          </p>
          <form onSubmit={handlePasswordSave}>
            <div className="form-group">
              <label>New Password</label>
              <input className="form-control" type="password" value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} minLength={6} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input className="form-control" type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Change Password'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  title:     { fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.25rem' },
  banner:    { display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', marginBottom: '1.5rem' },
  avatar:    { width: 64, height: 64, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, flexShrink: 0 },
  tabs:      { display: 'flex', gap: '.5rem', marginBottom: '1.25rem' },
  tab:       { padding: '.55rem 1.25rem', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '.9rem', color: '#64748b' },
  tabActive: { background: '#2563eb', color: '#fff', borderColor: '#2563eb' },
};