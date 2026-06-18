require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedReviews() {
  try {
    // 1. Fetch some products
    const { data: products, error: prodErr } = await supabase.from('products').select('id').limit(3);
    if (prodErr) throw prodErr;
    if (!products || products.length === 0) {
      console.log('No products found to attach reviews to.');
      return;
    }

    // 2. Fetch some users
    const { data: users, error: userErr } = await supabase.from('profiles').select('id').limit(3);
    if (userErr) throw userErr;
    if (!users || users.length === 0) {
      console.log('No users found to author the reviews.');
      return;
    }

    const reviews = [
      {
        product_id: products[0].id,
        user_id: users[0].id,
        rating: 5,
        title: 'Absolutely fantastic!',
        body: 'I am blown away by the quality. It exceeded all my expectations and arrived two days early. Highly recommended to everyone!',
      },
      {
        product_id: products[0].id,
        user_id: users[1 % users.length].id,
        rating: 1,
        title: 'Terrible, broke immediately',
        body: 'This is completely unacceptable. The item arrived with a huge crack, and when I tried to use it, it fell apart. I need a refund ASAP! My business depends on this.',
      },
      {
        product_id: products[1 % products.length].id,
        user_id: users[2 % users.length].id,
        rating: 3,
        title: 'It is okay',
        body: 'It works exactly as described. Nothing spectacular, but it gets the job done for the price. Not bad.',
      },
      {
        product_id: products[2 % products.length].id,
        user_id: users[0].id,
        rating: 2,
        title: 'Missing parts',
        body: 'The package was missing the charger and the instruction manual. Please send the missing parts quickly, I cannot use it without them.',
      },
      {
        product_id: products[2 % products.length].id,
        user_id: users[1 % users.length].id,
        rating: 5,
        title: 'Wow!',
        body: 'Such a great purchase. The battery life is phenomenal. I love the sleek design.',
      }
    ];

    const { data, error } = await supabase.from('product_reviews').insert(reviews);
    
    if (error) {
      console.error('Error inserting reviews:', error);
    } else {
      console.log('Successfully seeded synthetic reviews!');
    }
  } catch (err) {
    console.error('Script failed:', err);
  }
}

seedReviews();
