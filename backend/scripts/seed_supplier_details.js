require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSuppliers() {
  try {
    // Get unique product IDs from reviews
    const { data: reviews, error: revErr } = await supabase.from('product_reviews').select('product_id');
    if (revErr) throw revErr;

    const productIds = [...new Set(reviews.map(r => r.product_id))];

    if (productIds.length < 3) {
      console.log('Not enough reviewed products found to update.');
    }

    const updates = [
      {
        id: productIds[0],
        name: 'Pro Audio Wireless Headphones',
        supplier_name: 'AudioTech Pro',
        supplier_email: 'audiotech@example.com',
      },
      {
        id: productIds[1],
        name: 'Smart Home Security Camera',
        supplier_name: 'SecureVision Inc',
        supplier_email: 'securevision@example.com',
      },
      {
        id: productIds[2],
        name: 'Ergonomic Office Chair',
        supplier_name: 'Comfort Seating Co',
        supplier_email: 'support@comfortseating.com',
      }
    ];

    for (const update of updates) {
      if (!update.id) continue;
      const { error } = await supabase
        .from('products')
        .update({ 
          name: update.name,
          supplier_name: update.supplier_name, 
          supplier_email: update.supplier_email 
        })
        .eq('id', update.id);
      
      if (error) {
        console.error(`Failed to update product ${update.id}:`, error);
      } else {
        console.log(`Updated product ${update.id} with supplier ${update.supplier_name}`);
      }
    }

    console.log('Successfully updated reviewed products with supplier details!');
  } catch (err) {
    console.error('Script failed:', err);
  }
}

seedSuppliers();
