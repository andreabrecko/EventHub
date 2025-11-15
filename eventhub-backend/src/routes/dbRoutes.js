// File: src/routes/dbRoutes.js
// Rotte di diagnostica DB: ping, status e smoke test CRUD basilare.

const express = require('express');
const router = express.Router();
const { pool, getDBStatus } = require('../config/db');

// GET /api/db/status → stato e via di connessione
router.get('/status', (req, res) => {
  const status = getDBStatus();
  res.status(200).json({ ok: true, status });
});

// GET /api/db/ping → SELECT 1
router.get('/ping', async (req, res) => {
  try {
    const r = await pool.query('SELECT 1');
    res.status(200).json({ ok: true, rows: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/db/smoke → inserisce ed elimina una categoria di test
router.post('/smoke', async (req, res) => {
  const name = 'TEST_SMOKE_CAT';
  try {
    await pool.query('BEGIN');
    await pool.query('CREATE TABLE IF NOT EXISTS Categories (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL)');
    await pool.query('INSERT INTO Categories(name) VALUES($1) ON CONFLICT(name) DO NOTHING', [name]);
    const sel = await pool.query('SELECT id,name FROM Categories WHERE name=$1', [name]);
    await pool.query('DELETE FROM Categories WHERE name=$1', [name]);
    await pool.query('COMMIT');
    res.status(200).json({ ok: true, inserted: sel.rows[0] || null });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;