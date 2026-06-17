// config/db.js – Supabase client (server-side, uses service role key)
// The service role key bypasses Row-Level Security for trusted server operations.
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Quick connectivity check on startup
supabase
  .from('categories')
  .select('id', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.error('❌  Supabase connection failed:', error.message);
      process.exit(1);
    }
    console.log('✅  Supabase connected');
  });

module.exports = supabase;