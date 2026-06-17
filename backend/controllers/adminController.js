// controllers/adminController.js – Admin-only operations
const supabase = require('../config/db');

// ── GET /api/admin/dashboard ───────────────────────────────────
exports.getDashboard = async (_req, res, next) => {
  try {
    const [
      { count: totalUsers },
      { count: totalProducts },
      { count: totalOrders },
      { data: revenueData },
      { data: recentOrders },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount').neq('status', 'cancelled'),
      supabase
        .from('orders')
        .select('id, status, total_amount, created_at, profiles ( name )')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Sum revenue client-side (Supabase doesn't have a SUM shortcut in JS client)
    const revenue = (revenueData || []).reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    const shaped = (recentOrders || []).map(o => ({
      id:           o.id,
      status:       o.status,
      total_amount: o.total_amount,
      created_at:   o.created_at,
      customer:     o.profiles?.name || 'Unknown',
    }));

    res.json({
      totalUsers:    totalUsers   || 0,
      totalProducts: totalProducts || 0,
      totalOrders:   totalOrders  || 0,
      revenue:       parseFloat(revenue.toFixed(2)),
      recentOrders:  shaped,
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/orders ──────────────────────────────────────
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * Number(limit);
    const to   = from + Number(limit) - 1;

    let query = supabase
      .from('orders')
      .select('id, status, total_amount, payment_status, created_at, profiles ( name, id )', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data: orders, error } = await query;
    if (error) throw error;

    const shaped = (orders || []).map(o => ({
      ...o,
      customer: o.profiles?.name,
      profiles: undefined,
    }));

    res.json({ orders: shaped });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/orders/:id/status ────────────────────────
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Order status updated' });
  } catch (err) { next(err); }
};

// ── GET /api/admin/users ───────────────────────────────────────
exports.getAllUsers = async (_req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch emails from auth.users via admin API
    const { data: authData } = await supabase.auth.admin.listUsers();
    const emailMap = {};
    (authData?.users || []).forEach(u => { emailMap[u.id] = u.email; });

    const merged = (users || []).map(u => ({ ...u, email: emailMap[u.id] || '' }));
    res.json({ users: merged });
  } catch (err) { next(err); }
};