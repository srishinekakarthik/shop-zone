// controllers/orderController.js
const supabase = require('../config/db');

// ── POST /api/orders  (checkout) ──────────────────────────────
exports.createOrder = async (req, res, next) => {
  try {
    const { shipping_address, payment_method = 'cod' } = req.body;
    const userId = req.user.id;

    // 1. Fetch cart items with product details
    const { data: cartItems, error: cartErr } = await supabase
      .from('cart')
      .select('quantity, products ( id, name, price, stock )')
      .eq('user_id', userId);

    if (cartErr) throw cartErr;
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // 2. Verify stock and compute total
    let total = 0;
    for (const item of cartItems) {
      const product = item.products;
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for "${product.name}"` });
      }
      total += product.price * item.quantity;
    }

    // 3. Create order record
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id:          userId,
        total_amount:     parseFloat(total.toFixed(2)),
        shipping_address: shipping_address,
        payment_method:   payment_method,
      })
      .select('id')
      .single();

    if (orderErr) throw orderErr;
    const orderId = order.id;

    // 4. Insert order items
    const orderItems = cartItems.map(item => ({
      order_id:     orderId,
      product_id:   item.products.id,
      quantity:     item.quantity,
      unit_price:   item.products.price,
      product_name: item.products.name,
    }));

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsErr) {
      // Compensate: delete the order we just created
      await supabase.from('orders').delete().eq('id', orderId);
      throw itemsErr;
    }

    // 5. Decrement stock for each product
    for (const item of cartItems) {
      const { error: stockErr } = await supabase.rpc('decrement_product_stock', {
        p_product_id: item.products.id,
        p_quantity:   item.quantity,
      });
      if (stockErr) {
        console.error('Stock decrement failed for product', item.products.id, stockErr.message);
      }
    }

    // 6. Clear cart
    await supabase.from('cart').delete().eq('user_id', userId);

    res.status(201).json({ message: 'Order placed', orderId });
  } catch (err) { next(err); }
};

// ── GET /api/orders  (my orders) ──────────────────────────────
exports.getMyOrders = async (req, res, next) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, status, total_amount, payment_status, payment_method,
        shipping_address, created_at,
        order_items ( product_id, product_name, quantity, unit_price,
          products ( image_url )
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const shaped = (orders || []).map(o => ({
      ...o,
      items: (o.order_items || []).map(oi => ({
        product_id:  oi.product_id,
        name:        oi.product_name,
        quantity:    oi.quantity,
        unit_price:  oi.unit_price,
        image_url:   oi.products?.image_url,
      })),
      order_items: undefined,
    }));

    res.json({ orders: shaped });
  } catch (err) { next(err); }
};

// ── GET /api/orders/:id ────────────────────────────────────────
exports.getOrder = async (req, res, next) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, status, total_amount, payment_status, payment_method,
        shipping_address, created_at,
        order_items ( product_id, product_name, quantity, unit_price,
          products ( image_url )
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !order) return res.status(404).json({ message: 'Order not found' });

    res.json({
      order: {
        ...order,
        items: (order.order_items || []).map(oi => ({
          product_id: oi.product_id,
          name:       oi.product_name,
          quantity:   oi.quantity,
          unit_price: oi.unit_price,
          image_url:  oi.products?.image_url,
        })),
        order_items: undefined,
      },
    });
  } catch (err) { next(err); }
};