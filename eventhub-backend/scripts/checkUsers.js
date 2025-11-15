require('dotenv').config();
const { pool } = require('../src/config/db');

(async () => {
  try {
    const targetEmail = process.argv[2] || 'andrea.brecko@edu-its.it';
    const c = await pool.query('SELECT COUNT(*) FROM Users');
    const f = await pool.query('SELECT id, username, role, email FROM Users WHERE email = $1', [targetEmail]);
    console.log(JSON.stringify({ totalUsers: Number(c.rows[0].count), found: f.rows[0] || null }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error querying Users:', e && e.message);
    process.exit(1);
  }
})();