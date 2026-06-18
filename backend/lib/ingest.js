// chatbot/lib/ingest.js
// Ingests ShopZone product catalogue, FAQs, and policies into the vector store
// Embeddings: Google Gemini text-embedding-004 (768-dim)

const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { SupabaseVectorStore }          = require('@langchain/community/vectorstores/supabase');
const { createClient }                 = require('@supabase/supabase-js');
const { Document }                     = require('@langchain/core/documents');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const embeddings = new GoogleGenerativeAIEmbeddings({
  model:  'gemini-embedding-2',
  apiKey: process.env.GOOGLE_API_KEY,
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize:    500,
  chunkOverlap: 80,
});

// ── Ingest product catalogue from Supabase ───────────────────
async function ingestProducts() {
  console.log('📦 Fetching products from Supabase...');

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, name, description, price, stock, is_active,
      categories ( name )
    `)
    .eq('is_active', true);

  if (error) throw error;

  const docs = products.map(p => new Document({
    pageContent: [
      `Product: ${p.name}`,
      `Category: ${p.categories?.name || 'Uncategorized'}`,
      `Price: ₹${p.price}`,
      `Stock: ${p.stock > 0 ? `${p.stock} units available` : 'Out of stock'}`,
      `Description: ${p.description || 'No description available'}`,
    ].join('\n'),
    metadata: {
      type:       'product',
      product_id: p.id,
      name:       p.name,
      price:      p.price,
      in_stock:   p.stock > 0,
    },
  }));

  const chunks = await splitter.splitDocuments(docs);

  console.log(`  → Prepared ${chunks.length} product chunks`);
  return chunks;
}

// ── Ingest FAQ / Policy documents ────────────────────────────
function getFAQDocuments() {
  const faqs = [
    {
      q: 'How do I track my order?',
      a: 'Log into your ShopZone account, go to "My Orders", and click on any order to see its current status: Pending → Processing → Shipped → Delivered.',
    },
    {
      q: 'What payment methods does ShopZone accept?',
      a: 'ShopZone accepts Cash on Delivery (COD), UPI, credit/debit cards, and net banking.',
    },
    {
      q: 'How long does delivery take?',
      a: 'Standard delivery takes 3–7 business days. Express delivery (1–2 days) is available in select cities.',
    },
    {
      q: 'Can I cancel or modify my order?',
      a: 'Orders can be cancelled within 1 hour of placing them. Go to My Orders → Select Order → Cancel. After 1 hour, contact our support team.',
    },
    {
      q: 'What is the return policy?',
      a: 'ShopZone offers a 7-day return window from the date of delivery. Items must be unused, in original packaging. Initiate returns from My Orders page.',
    },
    {
      q: 'How do I create an account?',
      a: 'Click "Register" on the top right, enter your name, email, and password. You can also sign in with Google.',
    },
    {
      q: 'Is my payment information secure?',
      a: 'Yes. ShopZone uses industry-standard SSL encryption. We never store your card details.',
    },
    {
      q: 'How do I contact customer support?',
      a: 'Email us at support@shopzone.in or chat with our assistant. Support hours: Mon–Sat, 9 AM – 6 PM IST.',
    },
    {
      q: 'Do you offer EMI options?',
      a: 'EMI is available on orders above ₹3,000 via select credit cards. Choose EMI at checkout.',
    },
    {
      q: 'How do I update my delivery address?',
      a: 'Go to Profile → Edit Profile to update your default address. You can also enter a new address at checkout.',
    },
  ];

  return faqs.map(faq =>
    new Document({
      pageContent: `Q: ${faq.q}\nA: ${faq.a}`,
      metadata: { type: 'faq', question: faq.q },
    })
  );
}

// ── Ingest shipping & returns policy ─────────────────────────
function getPolicyDocuments() {
  const policies = [
    {
      title: 'Shipping Policy',
      body: `ShopZone ships across India. Free shipping on orders above ₹499. Standard shipping fee is ₹49 for orders below ₹499. Delivery timeline: Metro cities 2–3 days, Tier-2 cities 4–5 days, Remote areas 6–8 days. Orders placed before 12 PM are dispatched the same day (business days only).`,
    },
    {
      title: 'Returns & Refunds Policy',
      body: `Products can be returned within 7 days of delivery. Refunds are processed within 5–7 business days to the original payment method. Cash on Delivery orders are refunded via bank transfer. Electronics must be returned in sealed packaging. Clothing returns are accepted only with original tags.`,
    },
    {
      title: 'Privacy Policy Summary',
      body: `ShopZone collects only the data necessary to process your orders: name, email, address, and payment method. We do not sell your data to third parties. You can delete your account at any time from your profile settings.`,
    },
  ];

  return policies.map(p =>
    new Document({
      pageContent: `${p.title}\n\n${p.body}`,
      metadata: { type: 'policy', title: p.title },
    })
  );
}

// ── Main Ingest Function ──────────────────────────────────────
async function runIngest() {
  console.log('🚀 Starting ShopZone knowledge base ingestion...');

  const productChunks = await ingestProducts();
  const faqDocs       = getFAQDocuments();
  const policyDocs    = getPolicyDocuments();

  const allDocs = [...productChunks, ...faqDocs, ...policyDocs];

  console.log(`📚 Ingesting ${allDocs.length} total documents...`);

  await SupabaseVectorStore.fromDocuments(allDocs, embeddings, {
    client:    supabase,
    tableName: 'documents',
    queryName: 'match_documents',
  });

  console.log('✅ Ingestion complete!');
  return { ingested: allDocs.length };
}

module.exports = { runIngest };
