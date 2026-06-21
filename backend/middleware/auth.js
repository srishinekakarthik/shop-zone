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

/**
 * supplierOnly – must come AFTER protect middleware.
 * Allows access to suppliers regardless of approval status (e.g. so a
 * pending supplier can still view their "awaiting approval" screen).
 */
const supplierOnly = (req, res, next) => {
  if (req.user?.role !== 'supplier') {
    return res.status(403).json({ message: 'Supplier access required' });
  }
  next();
};

/**
 * supplierApprovedOnly – must come AFTER protect middleware.
 * This is the gate that actually matters: a supplier cannot add
 * products, view orders, or manage inventory until an admin has
 * approved their account. We look this up fresh on every request
 * (rather than trusting a JWT claim) so a same-day admin approval
 * or rejection takes effect immediately without forcing a re-login.
 */
const supplierApprovedOnly = async (req, res, next) => {
  if (req.user?.role !== 'supplier') {
    return res.status(403).json({ message: 'Supplier access required' });
  }

  const { data: supplier, error } = await supabase
    .from('suppliers')
    .select('status')
    .eq('id', req.user.id)
    .single();

  if (error || !supplier) {
    return res.status(403).json({ message: 'Supplier profile not found' });
  }

  if (supplier.status !== 'approved') {
    return res.status(403).json({
      message: supplier.status === 'pending'
        ? 'Your supplier account is pending admin approval'
        : 'Your supplier application was not approved',
      status: supplier.status,
    });
  }

  next();
};

module.exports = { protect, adminOnly, supplierOnly, supplierApprovedOnly };
