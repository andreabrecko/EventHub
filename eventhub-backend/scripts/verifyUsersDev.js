#!/usr/bin/env node
require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  try {
    const emails = ['andrea.brecko@edu-its.it', 'admin@test.com'];
    for (const email of emails) {
      const sel = await pool.query('SELECT id, email_verified FROM Users WHERE email = $1', [email]);
      const user = sel.rows[0];
      if (!user) {
        console.log(`SKIP: utente non trovato: ${email}`);
        continue;
      }
      if (user.email_verified === true) {
        console.log(`OK: email già verificata per ${email}`);
        continue;
      }
      await pool.query('UPDATE Users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1', [user.id]);
      console.log(`DONE: email verificata per ${email}`);
    }
    process.exit(0);
  } catch (e) {
    console.error('Errore verifica utenti:', e && e.message);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch(_) {}
  }
})();