// controllers/supplierController.js
// Every query here is scoped to the authenticated supplier's own data.
// This is what makes it different from adminController.js: there is no
// query in this file that can return another supplier's products, orders,
// or analytics — supplier_id = req.user.id is enforced on every read/write.
const supabase = require('../config/db');
const slugify  = require('slugify');

// ── GET /api/supplier/me ────────────────────────────────────────
// Returns the supplier's own business profile + approval status.
exports.getMyProfile = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Supplier profile not found' });
    res.json({ supplier: data });
  } catch (err) { next(err); }
};

// ── PUT /api/supplier/me ────────────────────────────────────────
exports.updateMyProfile = async (req, res, next) => {
  try {
    const { business_name, phone, description, reorder_threshold } = req.body;
    const updates = {};
    if (business_name     !== undefined) updates.business_name     = business_name;
    if (phone              !== undefined) updates.phone             = phone;
    if (description        !== undefined) updates.description       = description;
    if (reorder_threshold  !== undefined) updates.reorder_threshold = reorder_threshold;

    const { error } = await supabase.from('suppliers').update(updates).eq('id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Profile updated' });
  } catch (err) { next(err); }
};

// ── GET /api/supplier/dashboard ─────────────────────────────────
// "Business overview" numbers, scoped to this supplier only —
// the supplier-side equivalent of adminController.getDashboard.
exports.getDashboard = async (req, res, next) => {
  try {
    const supplierId = req.user.id;

    const [
      { count: totalProducts },
      { data: productsData },
      { data: orderItemsData },
      { data: openRestocks },
    ] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true })
        .eq('supplier_id', supplierId).eq('is_active', true),
      supabase.from('products').select('id, stock, reorder_threshold')
        .eq('supplier_id', supplierId).eq('is_active', true),
      supabase.from('v_supplier_order_items').select('line_total, order_status, order_date')
        .eq('supplier_id', supplierId),
      supabase.from('restock_alerts').select('id').eq('supplier_id', supplierId).eq('status', 'open'),
    ]);

    const lowStockCount = (productsData || []).filter(p => p.stock <= p.reorder_threshold).length;
    const validOrderItems = (orderItemsData || []).filter(o => o.order_status !== 'cancelled');
    const revenue = validOrderItems.reduce((sum, o) => sum + parseFloat(o.line_total || 0), 0);

    res.json({
      totalProducts:    totalProducts || 0,
      lowStockCount,
      openRestockCount: (openRestocks || []).length,
      revenue:          parseFloat(revenue.toFixed(2)),
      unitsSold:        validOrderItems.length,
    });
  } catch (err) { next(err); }
};

// ── GET /api/supplier/intelligence ──────────────────────────────
// The supplier-side equivalent of adminController.getIntelligence,
// but filtered to only this supplier's products. This is the data
// source for the supplier's own "Customer Intelligence" + "AI
// Insights" dashboard sections.
exports.getMyIntelligence = async (req, res, next) => {
  try {
    const supplierId = req.user.id;

    const { data: sentimentRows, error } = await supabase
      .from('v_supplier_sentiment_summary')
      .select('*')
      .eq('supplier_id', supplierId);

    if (error) throw error;

    const rows = sentimentRows || [];
    const totals = rows.reduce((acc, row) => {
      acc.totalReviews += Number(row.total_reviews || 0);
      acc.positive     += Number(row.positive_count || 0);
      acc.neutral      += Number(row.neutral_count  || 0);
      acc.negative     += Number(row.negative_count || 0);
      acc.highUrgency  += Number(row.urgency_high_count || 0);
      return acc;
    }, { totalReviews: 0, positive: 0, neutral: 0, negative: 0, highUrgency: 0 });

    const totalScored = rows.reduce((s, r) => s + Number(r.total_reviews || 0), 0);
    const weightedAvgScore = totalScored > 0
      ? rows.reduce((s, r) => s + (Number(r.avg_sentiment_score || 0) * Number(r.total_reviews || 0)), 0) / totalScored
      : 0;

    // Complaint category breakdown for THIS supplier's products only
    const { data: productIdsRows } = await supabase
      .from('products').select('id').eq('supplier_id', supplierId);
    const productIds = (productIdsRows || []).map(p => p.id);

    let complaintCategories = [];
    if (productIds.length > 0) {
      const { data: complaints } = await supabase
        .from('product_reviews')
        .select('complaint_category')
        .in('product_id', productIds)
        .eq('sentiment', 'negative')
        .not('complaint_category', 'is', null)
        .neq('complaint_category', 'none');

      const counts = {};
      (complaints || []).forEach(c => {
        counts[c.complaint_category] = (counts[c.complaint_category] || 0) + 1;
      });
      complaintCategories = Object.entries(counts)
        .map(([complaint_category, total]) => ({ complaint_category, total }))
        .sort((a, b) => b.total - a.total);
    }

    const topPraises   = [...rows].sort((a, b) => (b.avg_sentiment_score || 0) - (a.avg_sentiment_score || 0)).slice(0, 5);
    const topIssues    = [...rows].sort((a, b) => (a.avg_sentiment_score || 0) - (b.avg_sentiment_score || 0)).slice(0, 5);
    const riskProducts = [...rows]
      .filter(r => Number(r.negative_count) > 0)
      .sort((a, b) => Number(b.negative_count) - Number(a.negative_count))
      .slice(0, 10);

    res.json({
      sentimentScore: { overallScore: parseFloat(weightedAvgScore.toFixed(3)), ...totals },
      reviewVolume: totals.totalReviews,
      complaintCategories,
      topPraises,
      topIssues,
      riskProducts,
      products: rows,
    });
  } catch (err) { next(err); }
};

// ── GET /api/supplier/products ──────────────────────────────────
exports.getMyProducts = async (req, res, next) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, price, stock, reorder_threshold, image_url, is_active, description, created_at,
        categories ( id, name )
      `)
      .eq('supplier_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const flat = (products || []).map(p => ({
      ...p,
      category_id:   p.categories?.id,
      category_name: p.categories?.name,
      categories:    undefined,
      is_low_stock:  p.stock <= p.reorder_threshold,
    }));

    res.json({ products: flat });
  } catch (err) { next(err); }
};

// ── POST /api/supplier/products ───────────────────────────────
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category_id, image_url, reorder_threshold } = req.body;
    const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now().toString(36);

    const { data: supplierRow } = await supabase
      .from('suppliers').select('business_name, business_email').eq('id', req.user.id).single();

    const { data, error } = await supabase
      .from('products')
      .insert({
        name, slug, description, price, stock, category_id, image_url,
        supplier_id:        req.user.id,
        supplier_name:      supplierRow?.business_name,
        supplier_email:     supplierRow?.business_email,
        reorder_threshold:  reorder_threshold || 5,
      })
      .select('id, slug')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

// ── PUT /api/supplier/products/:id ──────────────────────────────
// Ownership check: a supplier can only update their own product.
exports.updateProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category_id, image_url, is_active, reorder_threshold } = req.body;

    const { data: existing, error: findErr } = await supabase
      .from('products').select('id, supplier_id').eq('id', req.params.id).single();
    if (findErr || !existing) return res.status(404).json({ message: 'Product not found' });
    if (existing.supplier_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this product' });
    }

    const updates = {};
    if (name        !== undefined) { updates.name = name; updates.slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now().toString(36); }
    if (description !== undefined) updates.description = description;
    if (price       !== undefined) updates.price       = price;
    if (stock       !== undefined) updates.stock       = stock;
    if (category_id !== undefined) updates.category_id = category_id;
    if (image_url   !== undefined) updates.image_url   = image_url;
    if (reorder_threshold !== undefined) updates.reorder_threshold = reorder_threshold;
    if (is_active   !== undefined) updates.is_active   = is_active === true || is_active === 'true' || is_active === 1 || is_active === '1';

    const { error } = await supabase.from('products').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Product updated' });
  } catch (err) { next(err); }
};

// ── DELETE /api/supplier/products/:id  (soft delete, own only) ──
exports.deleteProduct = async (req, res, next) => {
  try {
    const { data: existing, error: findErr } = await supabase
      .from('products').select('id, supplier_id').eq('id', req.params.id).single();
    if (findErr || !existing) return res.status(404).json({ message: 'Product not found' });
    if (existing.supplier_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this product' });
    }

    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Product deactivated' });
  } catch (err) { next(err); }
};

// ── GET /api/supplier/orders ────────────────────────────────────
// Only the line items belonging to this supplier's products, even if
// the parent order also contains other suppliers' items.
exports.getMyOrders = async (req, res, next) => {
  try {
    const { data: items, error } = await supabase
      .from('v_supplier_order_items')
      .select('*')
      .eq('supplier_id', req.user.id)
      .order('order_date', { ascending: false });

    if (error) throw error;
    res.json({ orderItems: items || [] });
  } catch (err) { next(err); }
};

// ── GET /api/supplier/restock-alerts ────────────────────────────
exports.getRestockAlerts = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('restock_alerts')
      .select('id, product_id, stock_at_alert, threshold, status, notified_at, resolved_at, products ( name, image_url )')
      .eq('supplier_id', req.user.id)
      .order('notified_at', { ascending: false });

    if (error) throw error;
    res.json({ alerts: data || [] });
  } catch (err) { next(err); }
};

// ── POST /api/supplier/bulk-import ──────────────────────────────
// Supplier submits a list of product rows (parsed client-side from
// their CSV, see SupplierBulkImport.js). We just record a pending
// job; the n8n "Bulk Import" workflow picks it up via webhook,
// validates/normalizes rows, and calls bulk_insert_products().
exports.requestBulkImport = async (req, res, next) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'products array is required' });
    }

    const { data: job, error } = await supabase
      .from('bulk_import_jobs')
      .insert({ supplier_id: req.user.id, status: 'pending', rows_total: products.length })
      .select('id')
      .single();

    if (error) throw error;

    // Fire-and-forget webhook call to n8n; the job stays "pending" in our
    // DB until n8n updates it, so the UI can poll /bulk-import for status
    // even if this network call to n8n is slow or briefly fails.
    if (process.env.N8N_BULK_IMPORT_WEBHOOK_URL) {
      fetch(process.env.N8N_BULK_IMPORT_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, supplier_id: req.user.id, products }),
      }).catch(e => console.error('n8n bulk-import webhook call failed:', e.message));
    }

    res.status(201).json({ jobId: job.id, message: 'Import queued — processing in the background' });
  } catch (err) { next(err); }
};

// ── GET /api/supplier/bulk-import ───────────────────────────────
exports.getBulkImportJobs = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('bulk_import_jobs')
      .select('*')
      .eq('supplier_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ jobs: data || [] });
  } catch (err) { next(err); }
};
