require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateReviews() {
  // Get any product
  const { data: products } = await supabaseAdmin.from('products').select('*').limit(1);
  if (!products || products.length === 0) {
    console.log("No products found in DB.");
    return;
  }
  const product = products[0];

  // Get any user
  const { data: users } = await supabaseAdmin.from('profiles').select('id').limit(1);
  const userId = users && users.length > 0 ? users[0].id : null;

  if (!userId) {
    console.log("No users found to leave a review.");
    return;
  }

  const reviews = [
    {
      product_id: product.id,
      user_id: userId,
      rating: 5,
      title: "Absolutely fantastic!",
      body: "I am completely blown away by the quality of this item. It exceeded all my expectations and arrived extremely quickly. Will definitely buy again."
    },
    {
      product_id: product.id,
      user_id: userId,
      rating: 2,
      title: "Arrived broken and late",
      body: "The packaging was completely crushed when it arrived, and the item inside was damaged. I need a refund immediately! Customer service is completely ignoring my emails."
    },
    {
      product_id: product.id,
      user_id: userId,
      rating: 4,
      title: "Pretty good overall",
      body: "It's a solid product. Does exactly what it says on the tin. The only reason I took off a star is because the color is slightly different than the photos."
    }
  ];

  const { error } = await supabaseAdmin.from('product_reviews').insert(reviews);
  if (error) {
    console.error("Error inserting reviews:", error);
  } else {
    console.log(`Successfully added 3 synthetic reviews to product: ${product.name} (ID: ${product.id})`);
  }
}

generateReviews();
