# ShopZone Marketplace

ShopZone is a modern e-commerce platform featuring a robust React frontend, a scalable Node.js/Express backend, and a Supabase PostgreSQL database. It includes powerful workflow automation powered by n8n.

## Architecture

*   **Frontend:** React (Create React App), React Router, Context API, Axios, React Toastify for notifications. Runs on port 3000.
*   **Backend:** Node.js, Express, Supabase JS Client, jsonwebtoken for secure backend-to-n8n communication. Runs on port 5000.
*   **Database:** Supabase PostgreSQL with Row Level Security (RLS) and custom PL/pgSQL RPCs.
*   **Automation:** n8n Workflows for automated background tasks.

## Features

*   **Authentication:** Secure login and registration powered by Supabase Auth.
*   **Role-Based Access Control:** Distinct roles for Customers, Suppliers, and Admins.
*   **Product Management:** Browse categories, view products, manage cart, and place orders.
*   **Admin & Supplier Dashboards:** Dedicated dashboards for managing marketplace entities.
*   **Automated Workflows (n8n):**
    *   **Sentiment Analysis:** Automatic processing and analysis of customer feedback.
    *   **Bulk Import:** Allows admins and suppliers to bulk-import products via CSV/webhook.
    *   **New Product Marketing Emails:** Intelligently emails customers when a new product is added to a category they have previously purchased from (excluding customers who already bought the specific product). Features securely generated one-click unsubscribe links.

## Getting Started

### Prerequisites
*   Node.js (v16+)
*   Supabase Account (or local Supabase instance)
*   n8n (Self-hosted or n8n Cloud)

### Environment Variables
Both the `frontend` and `backend` directories contain a `.env` file that must be configured.

**Frontend (`frontend/.env`):**
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:5000/api
```

**Backend (`backend/.env`):**
```env
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
INGEST_SECRET_KEY=secure_random_secret_string
```

### Database Setup
Execute the SQL files located in the `database/` directory in your Supabase SQL Editor in the following order:
1. `schema.sql`
2. `migrations.sql`
3. `migrations_supplier.sql`
4. `migrations_vector.sql`
5. `migrations_marketplace.sql`
6. `migrations_marketing.sql`

### Running the Project

1.  **Start the Backend:**
    ```bash
    cd backend
    npm install
    npm run dev
    ```
2.  **Start the Frontend:**
    ```bash
    cd frontend
    npm install
    npm start
    ```

### Setting up n8n Workflows
Import the JSON files located in the `n8n-workflows/` directory directly into your n8n instance. Be sure to configure your n8n environment variables/credentials to match your Supabase instance and `INGEST_SECRET_KEY`.

## License
MIT
