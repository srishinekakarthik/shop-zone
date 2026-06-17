// controllers/userController.js
const supabase = require('../config/db');

// ── GET /api/users/profile ─────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, phone, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ user: { ...profile, email: req.user.email } });
  } catch (err) { next(err); }
};

// ── PUT /api/users/profile ─────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar_url } = req.body;
    const updates = {};

    if (name       !== undefined) updates.name       = name;
    if (phone      !== undefined) updates.phone      = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Profile updated' });
  } catch (err) { next(err); }
};

// ── PUT /api/users/password ────────────────────────────────────
// Password changes go through Supabase Auth admin API (server-side).
// The user must be authenticated (we already verified their token).
exports.changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
      password: newPassword,
    });

    if (error) throw error;
    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
};