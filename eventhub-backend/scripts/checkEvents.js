#!/usr/bin/env node
// Diagnostic script: count total events and approved events; list latest 10
require('dotenv').config();
const { Pool } = require('pg');

const useSSL = (process.env.DB_SSL === 'true') || (process.env.NODE_ENV === 'production');
const verifySSL = process.env.DB_SSL_VERIFY === 'true';
const connectionString = process.env.AIVEN_DATABASE_URL || process.env.DATABASE_URL || '';

const fs = require('fs');
let caCert = null;
try {
  if (process.env.DB_CA_CERT_PATH && fs.existsSync(process.env.DB_CA_CERT_PATH)) {
    caCert = fs.readFileSync(process.env.DB_CA_CERT_PATH, 'utf8');
  } else if (process.env.DB_CA_CERT) {
    caCert = process.env.DB_CA_CERT;
  }
} catch (_) {}

const sslConfig = (useSSL || !!connectionString)
  ? (verifySSL && caCert ? { ca: caCert, rejectUnauthorized: true } : { rejectUnauthorized: false })
  : false;

const pool = new Pool(
  connectionString
    ? { connectionString, ssl: sslConfig }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT) || 5432,
        ssl: sslConfig,
      }
);

async function main() {
  try {
    const total = await pool.query('SELECT COUNT(*)::int AS c FROM Events');
    const approved = await pool.query('SELECT COUNT(*)::int AS c FROM Events WHERE is_approved = TRUE');
    const latest = await pool.query('SELECT id, title, is_approved, event_date FROM Events ORDER BY created_at DESC LIMIT 10');
    console.log(JSON.stringify({ totalEvents: total.rows[0].c, approvedEvents: approved.rows[0].c, latest: latest.rows }, null, 2));
  } catch (err) {
    console.error('checkEvents error:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();