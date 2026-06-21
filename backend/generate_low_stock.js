require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createLowStockProduct() {
  // 1. Get or create an approved supplier
  let { data: suppliers } = await supabaseAdmin.from('suppliers').select('*').eq('status', 'approved').limit(1);
  let supplierId;
  let supplierName;

  if (!suppliers || suppliers.length === 0) {
    console.log("No approved supplier found. Creating a synthetic approved supplier...");
    const { data: profiles } = await supabaseAdmin.from('profiles').select('*').eq('role', 'supplier').limit(1);
    
    if (profiles && profiles.length > 0) {
      // Approve an existing pending supplier
      supplierId = profiles[0].id;
      const { error: updateErr } = await supabaseAdmin.from('suppliers')
        .update({ status: 'approved', business_name: 'Test Approved Supplier' })
        .eq('id', supplierId);
      
      if (updateErr) {
         console.error("Failed to approve supplier:", updateErr);
         return;
      }
      supplierName = 'Test Approved Supplier';
    } else {
      console.log("No supplier profile exists to approve! You must register a supplier first.");
      return;
    }
  } else {
    supplierId = suppliers[0].id;
    supplierName = suppliers[0].business_name;
  }

  // 2. Get a category id
  const { data: categories } = await supabaseAdmin.from('categories').select('id').limit(1);
  if (!categories || categories.length === 0) {
    console.error("No categories found.");
    return;
  }

  // 3. Create a low stock product
  const productName = `Limited Edition Watch ${Date.now()}`;
  const { data, error } = await supabaseAdmin.from('products').insert([
    {
      name: productName,
      slug: `limited-watch-${Date.now()}`,
      description: "A highly sought-after watch that is almost out of stock.",
      price: 4999,
      stock: 2, // Low stock!
      reorder_threshold: 5,
      category_id: categories[0].id,
      supplier_id: supplierId,
      supplier_name: supplierName,
      is_active: true
    }
  ]);

  if (error) {
    console.error("Error creating product:", error);
  } else {
    console.log(`Successfully created low-stock product "${productName}" (Stock: 2, Threshold: 5) for supplier "${supplierName}".`);
    console.log("You can now trigger the n8n restock alert workflow!");
  }
}

createLowStockProduct();
