// controllers/adminController.js – Admin-only operations
const supabase = require('../config/db');

// ── GET /api/admin/dashboard ───────────────────────────────────
// "Business Overview" tier of the redesigned admin dashboard:
// revenue, orders, customers, and suppliers at a glance.
exports.getDashboard = async (_req, res, next) => {
  try {
    const [
      { count: totalUsers },
      { count: totalProducts },
      { count: totalOrders },
      { data: revenueData },
      { data: recentOrdersData },
      { data: supplierCounts },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount').neq('status', 'cancelled'),
      supabase
        .from('orders')
        .select('id, status, total_amount, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('v_supplier_counts').select('*').single(),
    ]);

    // Sum revenue client-side
    const revenue = (revenueData || []).reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    // Fetch user profiles for recent orders
    const userIds = [...new Set((recentOrdersData || []).map(o => o.user_id))];
    const profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds);
      (profiles || []).forEach(p => { profilesMap[p.id] = p.name; });
    }

    const shaped = (recentOrdersData || []).map(o => ({
      id:           o.id,
      status:       o.status,
      total_amount: o.total_amount,
      created_at:   o.created_at,
      customer:     profilesMap[o.user_id] || 'Unknown',
    }));

    res.json({
      totalUsers:    totalUsers   || 0,
      totalProducts: totalProducts || 0,
      totalOrders:   totalOrders  || 0,
      revenue:       parseFloat(revenue.toFixed(2)),
      recentOrders:  shaped,
      suppliers: {
        pending:  supplierCounts?.pending_count  || 0,
        approved: supplierCounts?.approved_count || 0,
        rejected: supplierCounts?.rejected_count || 0,
        total:    supplierCounts?.total_count    || 0,
      },
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
      .select('id, status, total_amount, payment_status, created_at, user_id', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data: orders, error } = await query;
    if (error) throw error;

    // Fetch user profiles
    const userIds = [...new Set((orders || []).map(o => o.user_id))];
    const profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds);
      (profiles || []).forEach(p => { profilesMap[p.id] = p.name; });
    }

    const shaped = (orders || []).map(o => ({
      ...o,
      customer: profilesMap[o.user_id] || 'Unknown',
      user_id: undefined,
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

// ── GET /api/admin/suppliers ────────────────────────────────────
// ?status=pending|approved|rejected (omit for all)
exports.getSuppliers = async (req, res, next) => {
  try {
    let query = supabase
      .from('suppliers')
      .select('id, business_name, business_email, phone, description, status, reorder_threshold, created_at, approved_at, rejected_reason')
      .order('created_at', { ascending: false });

    if (req.query.status) query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ suppliers: data || [] });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/suppliers/:id/approve ──────────────────────
exports.approveSupplier = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('suppliers')
      .update({ status: 'approved', approved_by: req.user.id, approved_at: new Date().toISOString(), rejected_reason: null })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Supplier approved' });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/suppliers/:id/reject ───────────────────────
exports.rejectSupplier = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const { error } = await supabase
      .from('suppliers')
      .update({ status: 'rejected', rejected_reason: reason || 'Application did not meet marketplace requirements' })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Supplier application rejected' });
  } catch (err) { next(err); }
};

// ── GET /api/admin/intelligence ──────────────────────────────────
// Powers the redesigned "Customer Intelligence" + "AI Insights"
// sections of the admin dashboard, platform-wide (all suppliers'
// products combined). All data here is produced by the n8n sentiment
// workflow (sentiment, urgency, complaint_category columns).
exports.getIntelligence = async (_req, res, next) => {
  try {
    const [
      { data: sentimentRows },
      { data: complaintCategories },
      { data: riskProducts },
      { data: latestSnapshot },
      { data: topProductsRaw },
      { data: worstProductsRaw },
    ] = await Promise.all([
      supabase.from('product_reviews').select('sentiment, sentiment_score, urgency').not('analyzed_at', 'is', null),
      supabase.from('v_complaint_categories').select('*'),
      supabase.from('v_risk_products').select('*'),
      supabase.from('analytics_snapshots').select('metrics, snapshot_date')
        .eq('period', 'daily').order('snapshot_date', { ascending: false }).limit(1),
      supabase.from('v_sentiment_summary').select('*').gte('total_reviews', 1)
        .order('avg_sentiment_score', { ascending: false }).limit(5),
      supabase.from('v_sentiment_summary').select('*').gte('total_reviews', 1)
        .order('avg_sentiment_score', { ascending: true }).limit(5),
    ]);

    const rows = sentimentRows || [];
    const totalReviews = rows.length;
    const positive = rows.filter(r => r.sentiment === 'positive').length;
    const neutral  = rows.filter(r => r.sentiment === 'neutral').length;
    const negative = rows.filter(r => r.sentiment === 'negative').length;
    const avgScore = totalReviews > 0
      ? rows.reduce((s, r) => s + (parseFloat(r.sentiment_score) || 0), 0) / totalReviews
      : 0;
    const highUrgency = rows.filter(r => r.urgency === 'high').length;

    res.json({
      sentimentScore: { overallScore: parseFloat(avgScore.toFixed(3)), positive, neutral, negative, totalReviews, highUrgency },
      reviewVolume: totalReviews,
      complaintCategories: complaintCategories || [],
      topPraises: topProductsRaw || [],
      topIssues:  worstProductsRaw || [],
      riskProducts: riskProducts || [],
      latestSnapshot: latestSnapshot?.[0]?.metrics || null,
    });
  } catch (err) { next(err); }
};