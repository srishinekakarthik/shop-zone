# ShopZone – AI Integrations Setup Guide

Three integrations built for ShopZone:
1. **n8n Sentiment Analysis** – Analyzes customer reviews every 15 minutes, alerts on negative feedback
2. **n8n Scheduled Analytics** – Daily 8 AM email report with revenue, orders, sentiment & inventory
3. **LangChain Chatbot** – AI customer support widget powered by your product catalogue & FAQs

---

## Prerequisites

| Tool | Where to get |
|------|-------------|
| n8n (self-hosted or cloud) | https://n8n.io |
| OpenAI API key | https://platform.openai.com |
| Supabase project | Already set up (ShopZone uses it) |

---

## Step 1 — Database Migrations

Run these SQL files **in order** in your Supabase SQL Editor:

```
Supabase Dashboard → SQL Editor
```

### 1a. Core feedback & analytics tables
Copy-paste and run: `database/migrations.sql`

This creates:
- `product_reviews` table with sentiment columns
- `analytics_snapshots` table
- Views: `v_daily_orders`, `v_top_products`, `v_sentiment_summary`
- RPC functions: `get_unanalyzed_reviews()`, `update_review_sentiment()`

### 1b. Vector store (for chatbot)
First enable **pgvector** extension:
```
Supabase Dashboard → Database → Extensions → Search "vector" → Enable
```
Then run: `database/migrations_vector.sql`

This creates:
- `documents` table with 1536-dim vector column
- `match_documents()` RPC for similarity search

---

## Step 2 — n8n Workflows

### n8n Environment Variables
In n8n: **Settings → Variables** → Add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://yfzlvwgzzpcykseyueko.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key |
| `ADMIN_EMAIL` | Your admin email address |

### n8n Credentials
In n8n: **Credentials → New**
- Add **OpenAI** credential (your API key)
- Add **Gmail OAuth2** credential (for email reports & alerts)

### Import Workflows
1. n8n → **Workflows → Import from File**
2. Import `n8n-workflows/01_sentiment_analysis.json`
3. Import `n8n-workflows/02_scheduled_analytics.json`
4. Open each workflow, fix any red credential nodes, then **Activate**

### Workflow 1: Sentiment Analysis
- Runs **every 15 minutes**
- Fetches unanalyzed reviews from Supabase
- Sends each review body to GPT-4o-mini for sentiment scoring
- Writes `sentiment`, `sentiment_score`, `sentiment_label` back to `product_reviews`
- **Negative reviews** trigger an admin email alert

### Workflow 2: Scheduled Analytics
- Runs **every day at 08:00**
- Fetches: yesterday's orders, low-stock products (≤5 units), new user signups, yesterday's reviews
- Aggregates into a structured metrics snapshot saved to `analytics_snapshots`
- Sends a rich **HTML email report** to admin with revenue, cancel rate, sentiment bar chart, and inventory alerts

---

## Step 3 — LangChain Chatbot

### 3a. Install & Configure

```bash
cd langchain-chatbot
npm install

# Create .env from template
cp .env.example .env
# Fill in: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

### 3b. Ingest Knowledge Base

This loads your product catalogue, FAQs, and policies into the vector store:

```bash
npm run ingest
# or: node scripts/ingest.js
```

Re-run whenever products are added or FAQs are updated. You can also call:
```
POST /api/ingest
Headers: x-ingest-key: <INGEST_SECRET_KEY>
```

### 3c. Start Chatbot Server

```bash
npm start
# Runs on port 5001
```

For production, run alongside your ShopZone backend (port 5000).

### 3d. Add Chat Widget to Frontend

Copy `ChatBot.js` to your React frontend:
```bash
cp ChatBot.js ../frontend/src/components/common/ChatBot.js
```

Add to your `.env` in the frontend:
```
REACT_APP_CHATBOT_URL=http://localhost:5001
```

In `frontend/src/App.js`, import and add the widget:
```jsx
import ChatBot from './components/common/ChatBot';

// Inside your <Router>...</Router>, after all routes:
<ChatBot />
```

The widget appears as a floating 💬 button in the bottom-right corner.

---

## Step 4 — Adding the Review Form

To let customers leave reviews (which feed into sentiment analysis), add a review submission endpoint to your ShopZone backend:

```js
// In backend/routes/productRoutes.js
router.post('/:id/reviews', requireAuth, async (req, res) => {
  const { rating, title, body, order_id } = req.body;
  const { data, error } = await supabase
    .from('product_reviews')
    .insert({
      product_id: parseInt(req.params.id),
      user_id:    req.user.id,
      order_id:   order_id || null,
      rating, title, body
    })
    .select('id')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ id: data.id });
});
```

---

## Architecture Overview

```
Customer leaves review
       │
       ▼
product_reviews table (Supabase)
       │
       ▼  [every 15 min]
n8n Sentiment Workflow
  → GPT-4o-mini analysis
  → Updates sentiment/score
  → Email alert if negative
       │
       ▼
v_sentiment_summary view (queryable by admin dashboard)

──────────────────────────────────────────

       [daily 8 AM]
n8n Analytics Workflow
  → Pulls orders, users, reviews, stock
  → Saves to analytics_snapshots
  → Sends HTML email to admin

──────────────────────────────────────────

Customer chats on website
       │
       ▼
ChatBot.js (React widget)
       │  HTTP POST /api/chat
       ▼
LangChain Server (port 5001)
  → ConversationalRetrievalQAChain
  → Retrieves from Supabase vector store
  → GPT-4o-mini generates response
  → BufferMemory maintains conversation
       │
       ▼
Customer gets instant AI answer
```

---

## Troubleshooting

**n8n "Credential not found"** → Re-select the credential in the node settings.

**Ingest fails with "relation documents does not exist"** → Run `migrations_vector.sql` first.

**Chatbot returns empty answers** → Run `npm run ingest` to populate the vector store.

**Sentiment workflow does nothing** → Check if reviews exist with `analyzed_at IS NULL` and non-empty `body`.

**Low-stock alert firing incorrectly** → Threshold is ≤5 units. Adjust in the n8n HTTP Request query parameter.
