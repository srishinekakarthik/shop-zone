// controllers/userController.js
const crypto = require('crypto');
const supabase = require('../config/db');

// ── GET /api/users/profile ─────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, phone, avatar_url, marketing_opt_out, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ user: { ...profile, email: req.user.email } });
  } catch (err) { next(err); }
};

// ── PUT /api/users/profile ─────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar_url, marketing_opt_out } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (marketing_opt_out !== undefined) updates.marketing_opt_out = Boolean(marketing_opt_out);

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

// ── Unsubscribe token helpers ────────────────────────────────────
// The marketing email's unsubscribe link must work for a signed-out
// recipient, so it can't rely on a session cookie or JWT. Instead we
// sign a simple HMAC token over the user's id using a server-side
// secret, so the link itself is unguessable for any id other than
// the recipient's own. This is intentionally NOT a session — it
// grants exactly one capability (opt this specific user out of
// marketing email) and nothing else.
function signUnsubscribeToken(userId) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not configured');
  return crypto.createHmac('sha256', secret).update(userId).digest('hex');
}

function verifyUnsubscribeToken(userId, token) {
  if (!userId || !token) return false;
  const expected = signUnsubscribeToken(userId);
  // Constant-time comparison to avoid leaking the valid token via timing.
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(String(token), 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Exposed so n8n-workflows/05_new_product_marketing.json's email-build
// step can ask the backend for a valid link rather than each workflow
// needing to know the HMAC secret itself. Called server-to-server.
exports.getUnsubscribeLink = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const token = signUnsubscribeToken(userId);
    const url = `${process.env.CLIENT_ORIGIN}/unsubscribe?uid=${userId}&token=${token}`;
    res.json({ url });
  } catch (err) { next(err); }
};

// ── GET /api/users/unsubscribe ───────────────────────────────────
// Public — no auth required. The signed token IS the authorization.
// ?uid=<user_id>&token=<hmac>
exports.unsubscribeByToken = async (req, res, next) => {
  try {
    const { uid, token } = req.query;

    if (!verifyUnsubscribeToken(uid, token)) {
      return res.status(403).json({ message: 'Invalid or expired unsubscribe link' });
    }

    const { error } = await supabase.rpc('unsubscribe_from_marketing', { p_user_id: uid });
    if (error) throw error;

    res.json({ message: 'Unsubscribed from marketing emails' });
  } catch (err) { next(err); }
};