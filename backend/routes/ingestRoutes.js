// chatbot/routes/ingest.js
const express         = require('express');
const { runIngest }   = require('../lib/ingest');

const ingestRouter = express.Router();

/**
 * POST /api/ingest
 * Trigger re-ingestion of product catalogue + FAQs into vector store
 * Protected by a simple API key header
 */
ingestRouter.post('/', async (req, res) => {
  const apiKey = req.headers['x-ingest-key'];
  if (apiKey !== process.env.INGEST_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log(' Ingest triggered via API');
    const result = await runIngest();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: 'Ingest failed', detail: err.message });
  }
});

module.exports = { ingestRouter };
