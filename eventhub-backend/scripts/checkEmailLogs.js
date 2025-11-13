require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  try {
    const mode = process.argv[2] || 'email';
    if (mode === 'notification') {
      const userId = Number(process.argv[3] || 10);
      const r = await pool.query("SELECT type, status, message, meta, created_at FROM NotificationLogs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5", [userId]);
      console.log(JSON.stringify({ userId, items: r.rows }));
    } else {
      const email = process.argv[3] || 'andrea.brecko@edu-its.it';
      const r = await pool.query("SELECT status, subject, created_at FROM EmailLogs WHERE email = $1 AND type = 'login_notify' ORDER BY created_at DESC LIMIT 1", [email]);
      const last = r.rows[0] || null;
      console.log(JSON.stringify({ email, last }));
    }
    process.exit(0);
  } catch (e) {
    console.error('Error querying EmailLogs:', e && e.message);
    process.exit(1);
  }
})();