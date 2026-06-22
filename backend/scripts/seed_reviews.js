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
    const { data: products, error: prodErr } = await supabase.from('products').select('id').limit(10);
    if (prodErr) throw prodErr;
    if (!products || products.length === 0) {
      console.log('No products found to attach reviews to.');
      return;
    }

    // 2. Fetch some users
    const { data: users, error: userErr } = await supabase.from('profiles').select('id').limit(10);
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
      },
      {
        product_id: products[3 % products.length].id,
        user_id: users[3 % users.length].id,
        rating: 4,
        title: 'Good value for money',
        body: 'Pretty solid product overall. It has a nice finish and feels durable. Only docked a star because the packaging was slightly damaged upon arrival.',
      },
      {
        product_id: products[4 % products.length].id,
        user_id: users[4 % users.length].id,
        rating: 1,
        title: 'Do not buy this!',
        body: 'Total scam. The product looks nothing like the pictures and stopped working after 10 minutes. Extremely disappointed.',
      },
      {
        product_id: products[5 % products.length].id,
        user_id: users[5 % users.length].id,
        rating: 5,
        title: 'Perfect gift',
        body: 'Bought this as a gift for my partner and they absolutely loved it! It feels premium and the customer support was very helpful when I had a question.',
      },
      {
        product_id: products[6 % products.length].id,
        user_id: users[6 % users.length].id,
        rating: 3,
        title: 'Average experience',
        body: 'It is exactly what you pay for. Do not expect premium quality, but for occasional use, it perfectly meets my needs.',
      },
      {
        product_id: products[7 % products.length].id,
        user_id: users[7 % users.length].id,
        rating: 2,
        title: 'Disappointed with the sizing',
        body: 'The dimensions listed on the website are completely wrong. It doesn\'t fit my space at all. I will be returning this.',
      },
      {
        product_id: products[8 % products.length].id,
        user_id: users[8 % users.length].id,
        rating: 4,
        title: 'Pleasantly surprised',
        body: 'I was hesitant because there were no reviews, but I am so glad I took the risk. The build quality is excellent. Just wish it came in more colors.',
      },
      {
        product_id: products[9 % products.length].id,
        user_id: users[9 % users.length].id,
        rating: 5,
        title: 'Life changing!',
        body: 'I use this every single day. It has completely streamlined my workflow. I am buying a second one for my office!',
      },
      {
        product_id: products[0].id,
        user_id: users[2 % users.length].id,
        rating: 1,
        title: 'Horrible customer service',
        body: 'The product was defective out of the box, and the seller refused to offer a replacement or a refund. I am furious.',
      },
      {
        product_id: products[1 % products.length].id,
        user_id: users[3 % users.length].id,
        rating: 4,
        title: 'Very practical',
        body: 'Does exactly what it says on the tin. Easy to set up, easy to use, easy to clean. What more could you want?',
      },
      {
        product_id: products[2 % products.length].id,
        user_id: users[4 % users.length].id,
        rating: 5,
        title: 'A masterpiece',
        body: 'The craftsmanship is unparalleled. It arrived beautifully packaged and the attention to detail is evident in every aspect. Best purchase of the year.',
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
