// chatbot/scripts/ingest.js
// Run: node scripts/ingest.js
require('dotenv').config({ path: '../.env' });
const { runIngest } = require('../lib/ingest');

runIngest()
  .then(r => { console.log('Done:', r); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
