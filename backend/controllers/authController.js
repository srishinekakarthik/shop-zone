// controllers/authController.js
// With Supabase Auth, register/login are handled CLIENT-SIDE by the Supabase SDK.
// This controller only provides:
//   - GET /api/auth/me  →  returns the current user's profile from our DB
//   - POST /api/auth/sync-profile → called after OAuth signup to persist extra metadata
const supabase = require('../config/db');

// ── GET /api/auth/me ──────────────────────────────────────────
// Returns the full profile for the authenticated user.
exports.getMe = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, role, avatar_url, phone, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) return res.status(404).json({ message: 'Profile not found' });

    res.json({
      user: {
        id:         profile.id,
        name:       profile.name,
        email:      req.user.email,
        role:       profile.role,
        avatar_url: profile.avatar_url,
        phone:      profile.phone,
        created_at: profile.created_at,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/auth/sync-profile ───────────────────────────────
// Called after OAuth login to update name/avatar from provider metadata.
// Safe to call multiple times (upsert).
exports.syncProfile = async (req, res, next) => {
  try {
    const { name, avatar_url } = req.body;

    const { error } = await supabase
      .from('profiles')
      .update({
        ...(name       && { name }),
        ...(avatar_url && { avatar_url }),
      })
      .eq('id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Profile synced' });
  } catch (err) { next(err); }
};