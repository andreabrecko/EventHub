#!/usr/bin/env node
require('dotenv').config();
const { pool } = require('../src/config/db');

async function main() {
  try {
    const email = process.argv[2] || 'admin@test.com';
    const username = process.argv[3] || 'admin';
    const existing = await pool.query('SELECT id, role FROM Users WHERE email = $1', [email]);
    if (existing.rows.length) {
      const u = existing.rows[0];
      if (u.role !== 'admin') {
        const r = await pool.query('UPDATE Users SET role = $1 WHERE id = $2 RETURNING id, email, role', ['admin', u.id]);
        console.log('Utente aggiornato a admin:', r.rows[0]);
      } else {
        console.log('Utente admin già presente:', { id: u.id, email });
      }
    } else {
      // Hash per 'Password123' già presente in server.js
      const password_hash = '$2b$10$ATS/MbYYfvKO525VmkvpsuHq1hOU/76MEOj5AVzRgeUgvRZF2eJPO';
      const ins = await pool.query(
        'INSERT INTO Users (username, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, username, email, role',
        [username, email, password_hash, 'admin']
      );
      console.log('Utente admin creato:', ins.rows[0]);
    }
  } catch (e) {
    console.error('Errore creazione/aggiornamento admin:', e?.message || e);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch(_) {}
  }
}

main();