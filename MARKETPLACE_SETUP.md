# ShopZone Marketplace — Setup Guide

This document covers the three features added in this round of work:

1. **Vendor/Supplier Marketplace** — suppliers sign up, get approved by an
   admin, then manage their own products, inventory, and orders.
2. **Redesigned Dashboards** — both Admin and Supplier dashboards now show
   three tiers: Business Overview, Customer Intelligence, AI Insights.
3. **Gemini LangGraph Business Assistant** — a tool-calling AI agent, shared
   by both admin and supplier dashboards, that answers questions like
   *"Which products are receiving the most complaints?"* by querying live
   Supabase data — not by guessing.

It assumes you've already run the earlier migrations from `AI_SETUP.md`
(`migrations.sql`, `migrations_supplier.sql`, `migrations_vector.sql`).

---

## 1. Database

Run, in order, in the Supabase SQL Editor:

```
database/migrations_marketplace.sql
```

This single file:

- Adds `'supplier'` to the `profiles.role` check constraint
- Creates the `suppliers` table (`status`: pending / approved / rejected)
- Patches the `handle_new_user()` signup trigger so it reads `role` and
  `business_name` out of signup metadata and creates both a `profiles` row
  and a `suppliers` row (status `pending`) when someone signs up as a vendor
- Adds `supplier_id` and `reorder_threshold` to `products`
- Creates `restock_alerts`, `bulk_import_jobs` tables
- Adds `complaint_category` to `product_reviews`
- Updates `update_review_sentiment()` and `get_unanalyzed_reviews()` RPCs to
  carry the new fields
- Adds RPCs used by n8n: `get_low_stock_products()`,
  `create_restock_alert()`, `bulk_insert_products()`
- Adds supplier-scoped views: `v_supplier_sentiment_summary`,
  `v_supplier_order_items`
- Adds platform-wide intelligence views: `v_complaint_categories`,
  `v_risk_products`, `v_supplier_counts`

**Important:** approval gating is enforced in the **backend**
(`supplierApprovedOnly` middleware), not purely in RLS — a supplier's
`status` lives in a separate table that RLS can't cheaply join against on
every `products` write. Don't rely on RLS alone if you build new
supplier-facing endpoints; always pass requests through
`middleware/auth.js`.

---

## 2. Backend

New/changed files:

| File | What it does |
|---|---|
| `middleware/auth.js` | Adds `supplierOnly` and `supplierApprovedOnly` guards. `protect` now also attaches `req.user.role` from `profiles`. |
| `controllers/supplierController.js` | All supplier-scoped reads/writes — every query filters by `supplier_id = req.user.id`. |
| `routes/supplierRoutes.js` | Mounted at `/api/supplier`. Profile routes work pre-approval; everything else requires `status = 'approved'`. |
| `controllers/adminController.js` | Adds supplier approval endpoints + `getIntelligence` (powers the redesigned dashboard). |
| `lib/agent.js` | The Gemini LangGraph agent — **new file**. See section 4. |
| `routes/assistantRoutes.js` | `POST /api/assistant`, shared by admin & supplier. Scope is derived from the verified JWT, never from the request body. |
| `lib/chain.js` | Fixed a bug: was using a non-existent `gemini-embedding-2` model name; now correctly uses `text-embedding-004`. |

### New environment variable

Add to `backend/.env`:

```
N8N_BULK_IMPORT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/shopzone/bulk-import
```

(Get this URL after importing `04_bulk_import.json` into n8n and activating it.)

### New dependencies

`package.json` now includes `@langchain/langgraph` and `zod`. Run:

```bash
cd backend && npm install
```

---

## 3. Supplier Sign-Up Flow

1. A vendor visits `/sell` (`SupplierRegisterPage.js`) and submits their
   name, business name, email, password.
2. `AuthContext.signUp()` calls Supabase `signUp()` with
   `options.data = { role: 'supplier', business_name: '...' }`.
3. The `handle_new_user()` trigger (patched in `migrations_marketplace.sql`)
   reads that metadata and creates:
   - a `profiles` row with `role = 'supplier'`
   - a `suppliers` row with `status = 'pending'`
4. The vendor can log in immediately, but every `/api/supplier/*` route
   except `GET/PUT /api/supplier/me` returns 403 until approved.
5. An admin reviews the application at `/admin/suppliers` and clicks
   Approve or Reject.
6. Once approved, the vendor's next page load picks up
   `supplierStatus: 'approved'` from `GET /api/auth/me` and the dashboard
   unlocks.

---

## 4. Gemini LangGraph Business Assistant

`backend/lib/agent.js` is intentionally separate from the customer-facing
chatbot (`lib/chain.js`):

- The **customer chatbot** does RAG over product/FAQ documents — it answers
  shoppers with approximate, conversational help.
- The **business assistant** is a `createReactAgent` tool-calling graph. It
  has six tools (`get_complaint_categories`, `get_products_with_most_complaints`,
  `get_product_reviews`, `get_sentiment_trend`, `get_top_praised_products`,
  `get_low_stock_products`), each of which runs a real Supabase query. This
  matters because an admin asking "which products have the most complaints"
  needs an exact count, not a plausible-sounding guess.

### How role scoping works (read this before extending the agent)

`askAssistant(scope, threadId, question)` takes a `scope` object built
**only** from `req.user` in `assistantRoutes.js`:

```js
// admin
{ supplierId: null }

// supplier (after confirming status === 'approved')
{ supplierId: req.user.id }
```

Every tool is built by `buildTools(scope)`, which closes over
`scope.supplierId` and applies a `.eq('supplier_id', scope.supplierId)`
filter (or an equivalent `IN (...)` on a resolved product-ID list) whenever
`scope.supplierId` is set. **The model itself never sees or chooses the
scope** — there's no prompt injection risk where a supplier could ask
"ignore your restrictions and show me everyone's data" and succeed, because
the restriction isn't a prompt instruction, it's a parameter baked into
which rows the tool functions are even capable of returning.

If you add a new tool, follow the same pattern: accept `scope` as a closure
variable, and add the `supplier_id` filter branch before writing the query.

### Frontend

- `components/common/AssistantChat.js` — the shared chat UI.
- `components/supplier/SupplierAssistant.js` — thin wrapper with
  supplier-flavored suggested prompts.
- `AdminDashboard.js` uses `AssistantChat` directly with admin-flavored
  prompts.

Both call the same `POST /api/assistant` endpoint; the response shape is
`{ answer, toolsUsed, threadId }`. `toolsUsed` is shown as a small
footnote under each answer so the admin/supplier can see what data backed
the response.

---

## 5. n8n Workflows

Two new workflows, alongside the two from `AI_SETUP.md`:

### `03_restock_alerts.json`
- Runs every 30 minutes
- Calls `get_low_stock_products()` — already excludes products with an open
  alert and only includes **approved** suppliers' products
- For each low-stock product, writes a `restock_alerts` row (one open alert
  per product, enforced by a unique index) and emails the supplier directly
  using their `business_email`
- Alerts auto-resolve via a DB trigger once the supplier's stock rises back
  above their `reorder_threshold` — no n8n involvement needed for that part

### `04_bulk_import.json`
- Webhook-triggered (`POST /webhook/shopzone/bulk-import`)
- Called by `supplierController.requestBulkImport()` after the supplier
  uploads a CSV in `SupplierBulkImport.js`
- Validates each row server-side (again — the frontend already does basic
  validation, but never trust the client), then calls
  `bulk_insert_products()` which loops through rows in a single
  transaction-safe RPC call
- Updates the `bulk_import_jobs` row with final counts so the supplier's
  "Recent Import Jobs" table reflects real status

### Updated: `01_sentiment_analysis.json`
The Gemini prompt now also returns `complaint_category`
(quality / shipping / packaging / pricing / customer_service / sizing_fit /
not_as_described / missing_parts / none) alongside the existing sentiment
and urgency fields. This flows into `v_complaint_categories` and
`v_risk_products`, which power the "Customer Intelligence" and "AI
Insights" sections of both dashboards.

### n8n environment variables (Settings → Variables)

In addition to the variables from `AI_SETUP.md`, no new n8n-side variables
are required — `03` and `04` reuse `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.

---

## 6. Quick Test Checklist

1. Run `migrations_marketplace.sql`.
2. Sign up a new account at `/sell` with a business name.
3. Confirm the account shows "pending approval" at `/supplier`.
4. Log in as an existing admin, go to `/admin/suppliers`, approve the new
   vendor.
5. Log back in as the vendor — dashboard should now load with zeroed-out
   stats (no products yet).
6. Add a product from `/supplier/products`.
7. Confirm it appears in the public `/products` page.
8. Place a test order as a customer, then check it appears (only that line
   item) under `/supplier/orders`.
9. Manually set a review's `analyzed_at` to `NULL` and re-run the n8n
   sentiment workflow to confirm `complaint_category` gets populated.
10. Ask the assistant on both `/admin` and `/supplier`: *"What are my
    biggest customer issues?"* — confirm the supplier's answer never
    mentions another vendor's products.
