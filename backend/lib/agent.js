// lib/agent.js
// Gemini-powered LangGraph agent for the ADMIN and SUPPLIER dashboards.
//
// This is deliberately separate from lib/chain.js (the customer-facing
// chatbot):
//   - customer chatbot (chain.js) → RAG over product/FAQ docs, answers shoppers
//   - this agent (agent.js)       → tool-calling graph that queries Supabase
//     directly for precise aggregation (complaint counts, sentiment trends,
//     restock status). RAG is the wrong fit here: the admin/supplier needs
//     exact numbers, not "similar passages", so every tool below runs a
//     real Supabase query and returns structured data.
//
// SAME graph, SAME tools, for both roles — the role boundary is enforced
// by closing over `scope` (built from the caller's req.user) when the
// tools are constructed, not by the model's judgement. An admin's `scope`
// has supplierId = null (sees everything); a supplier's `scope` always
// has their own supplierId baked in, and every tool query is filtered by
// it server-side. The model never sees or chooses the scope — it can't
// be prompted into bypassing it.
//
// Built with @langchain/langgraph's createReactAgent: the model decides
// which tool(s) to call, observes the result, and either calls another
// tool or answers — which is what lets it handle multi-step questions
// like "what are the biggest issues this month" (category breakdown,
// then drill into the worst product, then summarize).

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { createClient }           = require('@supabase/supabase-js');
const { tool }                   = require('@langchain/core/tools');
const { z }                      = require('zod');
const { createReactAgent }       = require('@langchain/langgraph/prebuilt');
const { MemorySaver }            = require('@langchain/langgraph');
const { HumanMessage, BaseMessage } = require('@langchain/core/messages');

// MONKEY PATCH: @langchain/langgraph@0.2.74 calls m.getType() on messages,
// but @langchain/core@0.2.36 removed getType().
// This causes "TypeError: m.getType is not a function" crashes.
if (BaseMessage && !BaseMessage.prototype.getType) {
  BaseMessage.prototype.getType = function() {
    return this.type || (this.constructor.name || '').replace('Message', '').toLowerCase();
  };
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Tool factory ─────────────────────────────────────────────────
// Builds the six tools below, closing over `scope.supplierId`.
// scope.supplierId === null  → admin, platform-wide.
// scope.supplierId === '<uuid>' → supplier, filtered to their products.
function buildTools(scope) {
  const isSupplierScoped = Boolean(scope.supplierId);

  // Helper: resolve the set of product IDs this scope is allowed to see.
  // Only used by tools that need an explicit IN (...) filter (i.e. the
  // ones querying product_reviews directly rather than through a view
  // that already has supplier_id on it).
  async function getScopedProductIds() {
    if (!isSupplierScoped) return null; // null = "no filter, see everything"
    const { data } = await supabase.from('products').select('id').eq('supplier_id', scope.supplierId);
    return (data || []).map(p => p.id);
  }

  const getComplaintCategoriesTool = tool(
    async () => {
      if (!isSupplierScoped) {
        const { data, error } = await supabase.from('v_complaint_categories').select('*');
        if (error) return `Error: ${error.message}`;
        return data?.length ? JSON.stringify(data) : 'No negative reviews with categorized complaints found.';
      }
      const productIds = await getScopedProductIds();
      if (productIds.length === 0) return 'You have no products yet.';
      const { data, error } = await supabase
        .from('product_reviews')
        .select('complaint_category')
        .in('product_id', productIds)
        .eq('sentiment', 'negative')
        .not('complaint_category', 'is', null)
        .neq('complaint_category', 'none');
      if (error) return `Error: ${error.message}`;
      const counts = {};
      (data || []).forEach(r => { counts[r.complaint_category] = (counts[r.complaint_category] || 0) + 1; });
      const shaped = Object.entries(counts).map(([complaint_category, total]) => ({ complaint_category, total }))
        .sort((a, b) => b.total - a.total);
      return shaped.length ? JSON.stringify(shaped) : 'No negative reviews with categorized complaints found for your products.';
    },
    {
      name: 'get_complaint_categories',
      description:
        'Returns a count of negative reviews grouped by complaint category ' +
        '(quality, shipping, packaging, pricing, customer_service, sizing_fit, ' +
        'not_as_described, missing_parts). Use this to answer "what are customers ' +
        'complaining about" or "biggest customer issues" type questions.',
      schema: z.object({}),
    }
  );

  const getProductsWithMostComplaintsTool = tool(
    async ({ limit }) => {
      const query = supabase.from('v_risk_products').select('*').limit(limit || 10);
      const { data, error } = isSupplierScoped
        ? await query.eq('supplier_id', scope.supplierId)
        : await query;
      if (error) return `Error: ${error.message}`;
      return data?.length ? JSON.stringify(data) : 'No products currently have negative reviews.';
    },
    {
      name: 'get_products_with_most_complaints',
      description:
        'Returns the products receiving the most negative/high-urgency reviews, ' +
        'ranked by negative review count. Use this for "which products are receiving ' +
        'the most complaints" type questions.',
      schema: z.object({
        limit: z.number().optional().describe('Max number of products to return (default 10)'),
      }),
    }
  );

  const getProductReviewsTool = tool(
    async ({ product_name }) => {
      let productQuery = supabase.from('products').select('id, name').ilike('name', `%${product_name}%`).limit(5);
      if (isSupplierScoped) productQuery = productQuery.eq('supplier_id', scope.supplierId);

      const { data: products, error: prodErr } = await productQuery;
      if (prodErr) return `Error: ${prodErr.message}`;
      if (!products || products.length === 0) {
        return `No product found matching "${product_name}"${isSupplierScoped ? ' in your catalogue' : ''}. Try a different name.`;
      }

      const productIds = products.map(p => p.id);
      const { data: reviews, error: revErr } = await supabase
        .from('product_reviews')
        .select('product_id, rating, title, body, sentiment, sentiment_label, urgency, complaint_category, created_at')
        .in('product_id', productIds)
        .not('analyzed_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30);

      if (revErr) return `Error: ${revErr.message}`;
      if (!reviews || reviews.length === 0) {
        return `Found product(s) ${products.map(p => p.name).join(', ')} but no analyzed reviews yet.`;
      }

      return JSON.stringify({
        matchedProducts: products,
        reviews: reviews.map(r => ({
          product_id: r.product_id, rating: r.rating, title: r.title, body: r.body,
          sentiment: r.sentiment_label, urgency: r.urgency, category: r.complaint_category, date: r.created_at,
        })),
      });
    },
    {
      name: 'get_product_reviews',
      description:
        'Fetches recent customer reviews (with sentiment, urgency, and complaint ' +
        'category already analyzed) for a product matched by name. Use this to ' +
        'answer "summarize customer feedback for X" type questions. Pass the ' +
        'product name as mentioned by the user — partial matches work.',
      schema: z.object({
        product_name: z.string().describe('Product name or partial name to search for'),
      }),
    }
  );

  const getSentimentTrendTool = tool(
    async ({ days }) => {
      const since = new Date();
      since.setDate(since.getDate() - (days || 30));

      let query = supabase
        .from('product_reviews')
        .select('sentiment, sentiment_score, urgency, created_at, product_id')
        .not('analyzed_at', 'is', null)
        .gte('created_at', since.toISOString());

      if (isSupplierScoped) {
        const productIds = await getScopedProductIds();
        if (productIds.length === 0) return 'You have no products yet.';
        query = query.in('product_id', productIds);
      }

      const { data, error } = await query;
      if (error) return `Error: ${error.message}`;
      if (!data || data.length === 0) return `No analyzed reviews in the last ${days || 30} days.`;

      const total = data.length;
      const positive = data.filter(r => r.sentiment === 'positive').length;
      const neutral  = data.filter(r => r.sentiment === 'neutral').length;
      const negative = data.filter(r => r.sentiment === 'negative').length;
      const highUrgency = data.filter(r => r.urgency === 'high').length;
      const avgScore = data.reduce((s, r) => s + (parseFloat(r.sentiment_score) || 0), 0) / total;

      return JSON.stringify({
        windowDays: days || 30, totalReviews: total, positive, neutral, negative,
        highUrgencyCount: highUrgency, avgSentimentScore: parseFloat(avgScore.toFixed(3)),
      });
    },
    {
      name: 'get_sentiment_trend',
      description:
        'Returns aggregate sentiment counts (positive/neutral/negative), average ' +
        'sentiment score, and high-urgency review count over the last N days. Use ' +
        'this for "how is sentiment trending" or "this month" type questions.',
      schema: z.object({
        days: z.number().optional().describe('Number of days to look back (default 30)'),
      }),
    }
  );

  const getTopPraisedProductsTool = tool(
    async ({ limit }) => {
      const viewName = isSupplierScoped ? 'v_supplier_sentiment_summary' : 'v_sentiment_summary';
      let query = supabase.from(viewName).select('*').gte('total_reviews', 1)
        .order('avg_sentiment_score', { ascending: false }).limit(limit || 5);
      if (isSupplierScoped) query = query.eq('supplier_id', scope.supplierId);

      const { data, error } = await query;
      if (error) return `Error: ${error.message}`;
      return JSON.stringify(data || []);
    },
    {
      name: 'get_top_praised_products',
      description:
        'Returns the products with the highest average sentiment score — what ' +
        'customers like most. Use this for "top praises" or "best performing ' +
        'products" type questions.',
      schema: z.object({
        limit: z.number().optional().describe('Max number of products to return (default 5)'),
      }),
    }
  );

  const getLowStockProductsTool = tool(
    async () => {
      const { data, error } = await supabase.rpc('get_low_stock_products');
      if (error) return `Error: ${error.message}`;
      const filtered = isSupplierScoped
        ? (data || []).filter(p => p.supplier_id === scope.supplierId)
        : (data || []);
      return filtered.length ? JSON.stringify(filtered) : 'No products are currently low on stock.';
    },
    {
      name: 'get_low_stock_products',
      description:
        'Returns products that are at or below their restock threshold' +
        (isSupplierScoped ? ' for your own catalogue.' : ', along with the responsible supplier.') +
        ' Use this for "what needs restocking" or inventory-risk questions.',
      schema: z.object({}),
    }
  );

  return [
    getComplaintCategoriesTool,
    getProductsWithMostComplaintsTool,
    getProductReviewsTool,
    getSentimentTrendTool,
    getTopPraisedProductsTool,
    getLowStockProductsTool,
  ];
}

// ── LLM ──────────────────────────────────────────────────────────
const llm = new ChatGoogleGenerativeAI({
  model:       'gemini-2.5-flash',
  temperature: 0.2,
  apiKey:      process.env.GOOGLE_API_KEY,
});

function buildSystemPrompt(scope) {
  const audience = scope.supplierId
    ? `You are speaking with a VENDOR (supplier) on the ShopZone marketplace. Every tool you call is already restricted to this vendor's own products only — you cannot see or report on any other vendor's data, even if asked. If asked about another seller's products or platform-wide numbers, explain that you only have access to their own store's data.`
    : `You are speaking with a ShopZone ADMIN. You have visibility into the entire platform across all vendors.`;

  return `You are ShopZone's internal AI business analyst.

${audience}

You have direct tool access to live customer feedback data: sentiment analysis,
urgency levels, complaint categories, and inventory status — all pre-computed by
an automated n8n + Gemini pipeline that analyzes every customer review.

Guidelines:
- Always call a tool before answering questions about products, complaints, sentiment, or stock. Never guess or use general knowledge for ShopZone-specific data.
- When summarizing reviews, be concrete: cite actual numbers, product names, and complaint categories returned by your tools.
- If a question spans multiple angles (e.g. "biggest issues this month"), call multiple tools and synthesize — don't just dump one tool's raw output.
- Keep answers tight and scannable: short paragraphs or a brief bulleted list. This is a busy professional, not a chat with a customer.
- If a tool returns no data, say so plainly rather than inventing numbers.
- Never expose raw JSON — always translate tool results into plain, professional English.`;
}

// In-memory checkpointer keeps each conversation thread coherent.
// Swap for a persistent checkpointer (e.g. Postgres) in production if
// conversations need to survive a server restart.
const checkpointer = new MemorySaver();

// Cache one compiled agent per scope-key so we don't rebuild the graph
// on every request. Scope key is 'admin' or the supplier's UUID.
const agentCache = new Map();

function getAgent(scope) {
  const key = scope.supplierId || 'admin';
  if (!agentCache.has(key)) {
    agentCache.set(key, createReactAgent({
      llm,
      tools: buildTools(scope),
      stateModifier: buildSystemPrompt(scope),
      checkpointSaver: checkpointer,
    }));
  }
  return agentCache.get(key);
}

// ── Main entry point ───────────────────────────────────────────────
// scope: { supplierId: string | null }  — null means admin (platform-wide)
async function askAssistant(scope, threadId, question) {
  const agent = getAgent(scope);

  const result = await agent.invoke(
    { messages: [["human", question]] },
    { configurable: { thread_id: threadId } }
  );

  const lastMessage = result.messages[result.messages.length - 1];

  const toolCalls = result.messages
    .filter(m => m._getType?.() === 'ai' && m.tool_calls?.length)
    .flatMap(m => m.tool_calls.map(tc => tc.name));

  return {
    answer:    lastMessage.content,
    toolsUsed: [...new Set(toolCalls)],
    threadId,
  };
}

module.exports = { askAssistant };
