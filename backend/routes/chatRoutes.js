// chatbot/routes/chat.js
const express         = require('express');
const { v4: uuidv4 } = require('uuid');
const { chat, clearSession } = require('../lib/chain');

const chatRouter = express.Router();

/**
 * POST /api/chat
 * Body: { message: string, sessionId?: string }
 * Returns: { answer, sources, sessionId }
 */
chatRouter.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'message is required' });
    }

    // Use provided sessionId (for continuing conversation) or create new one
    const sid = sessionId || uuidv4();

    const result = await chat(sid, message.trim());
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat service unavailable', detail: err.message });
  }
});

/**
 * DELETE /api/chat/:sessionId
 * Clears conversation memory for a session
 */
chatRouter.delete('/:sessionId', (req, res) => {
  clearSession(req.params.sessionId);
  res.json({ cleared: true, sessionId: req.params.sessionId });
});

module.exports = { chatRouter };


// ────────────────────────────────────────────────────────────
// chatbot/routes/ingest.js
