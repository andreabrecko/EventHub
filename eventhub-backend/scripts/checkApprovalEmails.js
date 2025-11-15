#!/usr/bin/env node
require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  try {
    const r = await pool.query("SELECT email, type, subject, status, created_at, meta FROM EmailLogs WHERE type = 'event_approval' ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error querying EmailLogs:', e && e.message);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch(_) {}
  }
})();