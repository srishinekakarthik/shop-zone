// middleware/auth.js – Supabase JWT verification + role guard
const supabase = require('../config/db');

/**
 * protect – verifies the Supabase Bearer token and attaches req.user
 * Supabase tokens are standard JWTs; we validate them via auth.getUser()
 * which also handles token expiry and revocation checks.
 */
const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated – no token' });
  }

  const token = header.split(' ')[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // Fetch the role from our profiles table (source of truth for admin role)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, avatar_url, phone')
    .eq('id', user.id)
    .single();

  req.user = {
    id:        user.id,
    email:     user.email,
    role:      profile?.role || 'customer',
    name:      profile?.name,
    avatarUrl: profile?.avatar_url,
    phone:     profile?.phone,
  };

  next();
};

/**
 * adminOnly – must come AFTER protect middleware
 */
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { protect, adminOnly };
