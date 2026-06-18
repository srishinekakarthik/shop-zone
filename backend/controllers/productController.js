// controllers/productController.js
const supabase = require('../config/db');
const slugify  = require('slugify');

// ── GET /api/products ──────────────────────────────────────────
// Supports: ?search=&category=&minPrice=&maxPrice=&page=&limit=
exports.getProducts = async (req, res, next) => {
  try {
    const { search, category, minPrice, maxPrice, page = 1, limit = 12, all } = req.query;
    const from   = (page - 1) * Number(limit);
    const to     = from + Number(limit) - 1;

    let query = supabase
      .from('products')
      .select(`
        id, name, slug, price, stock, image_url, is_active, description, supplier_name, supplier_email,
        categories!inner ( id, name, slug )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Only filter active products for the public-facing store.
    // Admin can pass ?all=1 to see all products including inactive.
    if (!all || all !== '1') {
      query = query.eq('is_active', true);
    }

    if (search)   query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    if (category) query = query.eq('categories.slug', category);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);

    const { data: products, error, count } = await query;
    if (error) throw error;

    // Flatten the nested category join
    const flat = (products || []).map(p => ({
      ...p,
      category_id:   p.categories?.id,
      category_name: p.categories?.name,
      categories:    undefined,
    }));

    res.json({
      products: flat,
      pagination: {
        total: count || 0,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/products/:slug ────────────────────────────────────
exports.getProduct = async (req, res, next) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select(`*, categories ( id, name, slug )`)
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .single();

    if (error || !product) return res.status(404).json({ message: 'Product not found' });

    // Fetch reviews
    const { data: reviews } = await supabase
      .from('product_reviews')
      .select('id, rating, title, body, created_at, user_id')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false });

    let reviewsWithProfiles = reviews || [];
    if (reviews && reviews.length > 0) {
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
      
      reviewsWithProfiles = reviews.map(r => {
        const profile = (profiles || []).find(p => p.id === r.user_id);
        return {
          ...r,
          user_name: profile?.name || 'Verified Customer'
        };
      });
    }

    res.json({
      product: {
        ...product,
        category_name: product.categories?.name,
        category_slug: product.categories?.slug,
        categories:    undefined,
        reviews:       reviewsWithProfiles
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/products  (admin) ────────────────────────────────
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category_id, image_url, supplier_name, supplier_email } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const { data, error } = await supabase
      .from('products')
      .insert({ name, slug, description, price, stock, category_id, image_url, supplier_name, supplier_email })
      .select('id, slug')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

// ── PUT /api/products/:id  (admin) ─────────────────────────────
exports.updateProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category_id, image_url, is_active, supplier_name, supplier_email } = req.body;
    const updates = {};

    if (name        !== undefined) { updates.name = name; updates.slug = slugify(name, { lower: true, strict: true }); }
    if (description !== undefined) updates.description = description;
    if (price       !== undefined) updates.price       = price;
    if (stock       !== undefined) updates.stock       = stock;
    if (category_id !== undefined) updates.category_id = category_id;
    if (image_url   !== undefined) updates.image_url   = image_url;
    if (supplier_name !== undefined) updates.supplier_name = supplier_name;
    if (supplier_email!== undefined) updates.supplier_email = supplier_email;
    if (is_active   !== undefined) updates.is_active   = is_active === true || is_active === 'true' || is_active === 1 || is_active === '1';

    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Product updated' });
  } catch (err) { next(err); }
};

// ── DELETE /api/products/:id  (admin – soft delete) ───────────
exports.deleteProduct = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Product deactivated' });
  } catch (err) { next(err); }
};

// ── POST /api/products/:id/reviews ──────────────────────────────
exports.addReview = async (req, res, next) => {
  try {
    const { rating, title, body, order_id } = req.body;
    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: parseInt(req.params.id),
        user_id:    req.user.id,
        order_id:   order_id || null,
        rating, title, body
      })
      .select('id')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ id: data.id });
  } catch (err) { next(err); }
};