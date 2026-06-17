// controllers/cartController.js
const supabase = require('../config/db');

// ── GET /api/cart ──────────────────────────────────────────────
exports.getCart = async (req, res, next) => {
  try {
    const { data: items, error } = await supabase
      .from('cart')
      .select(`
        id, quantity,
        products ( id, name, slug, price, image_url, stock )
      `)
      .eq('user_id', req.user.id);

    if (error) throw error;

    const flat = (items || []).map(item => ({
      id:         item.id,
      quantity:   item.quantity,
      product_id: item.products?.id,
      name:       item.products?.name,
      slug:       item.products?.slug,
      price:      item.products?.price,
      image_url:  item.products?.image_url,
      stock:      item.products?.stock,
    }));

    const total = flat.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ items: flat, total: parseFloat(total.toFixed(2)) });
  } catch (err) { next(err); }
};

// ── POST /api/cart ─────────────────────────────────────────────
exports.addToCart = async (req, res, next) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    // Verify product exists and has enough stock
    const { data: prod, error: prodErr } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', product_id)
      .eq('is_active', true)
      .single();

    if (prodErr || !prod)      return res.status(404).json({ message: 'Product not found' });
    if (prod.stock < quantity) return res.status(400).json({ message: 'Insufficient stock' });

    // Upsert: if already in cart, increase quantity
    const { error } = await supabase
      .from('cart')
      .upsert(
        { user_id: req.user.id, product_id, quantity },
        {
          onConflict: 'user_id,product_id',
          ignoreDuplicates: false,
        }
      );

    // If upsert hit a conflict, increment instead
    if (error && error.code === '23505') {
      await supabase.rpc('increment_cart_quantity', {
        p_user_id: req.user.id,
        p_product_id: product_id,
        p_quantity: quantity,
      });
    } else if (error) {
      throw error;
    }

    res.status(201).json({ message: 'Added to cart' });
  } catch (err) { next(err); }
};

// ── PUT /api/cart/:id ──────────────────────────────────────────
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    if (quantity < 1) {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id);
      if (error) throw error;
      return res.json({ message: 'Item removed' });
    }

    const { error } = await supabase
      .from('cart')
      .update({ quantity })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Cart updated' });
  } catch (err) { next(err); }
};

// ── DELETE /api/cart/:id ───────────────────────────────────────
exports.removeFromCart = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Item removed from cart' });
  } catch (err) { next(err); }
};

// ── DELETE /api/cart  (clear entire cart) ─────────────────────
exports.clearCart = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Cart cleared' });
  } catch (err) { next(err); }
};