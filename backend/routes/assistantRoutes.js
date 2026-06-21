// routes/assistantRoutes.js
// One endpoint, shared by both the admin and supplier dashboards.
// The scope (platform-wide vs. own-store-only) is derived from
// req.user — set by the `protect` middleware from the verified
// Supabase JWT — never from anything the client sends. A supplier
// cannot pass a parameter to see another vendor's data; an admin
// always sees everything.
const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { askAssistant } = require('../lib/agent');
const { protect, adminOnly, supplierApprovedOnly } = require('../middleware/auth');
const supabase = require('../config/db');

const assistantRouter = express.Router();

assistantRouter.use(protect);

/**
 * POST /api/assistant
 * Body: { question: string, threadId?: string }
 * Returns: { answer, toolsUsed, threadId }
 *
 * Admins get platform-wide scope. Suppliers must be approved, and get
 * scope locked to their own supplier_id.
 */
assistantRouter.post('/', async (req, res) => {
  try {
    const { question, threadId } = req.body;
    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ error: 'question is required' });
    }

    let scope;
    if (req.user.role === 'admin') {
      scope = { supplierId: null };
    } else if (req.user.role === 'supplier') {
      const { data: supplier } = await supabase
        .from('suppliers').select('status').eq('id', req.user.id).single();
      if (!supplier || supplier.status !== 'approved') {
        return res.status(403).json({ error: 'Your supplier account is pending admin approval' });
      }
      scope = { supplierId: req.user.id };
    } else {
      return res.status(403).json({ error: 'Admin or approved supplier access required' });
    }

    const tid = threadId || `${req.user.id}-${uuidv4()}`;
    const result = await askAssistant(scope, tid, question.trim());
    res.json(result);
  } catch (err) {
    console.error('Assistant error:', err);
    res.status(500).json({ error: 'Assistant unavailable', detail: err.message });
  }
});

module.exports = { assistantRouter };
