#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

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

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);
  await pool.query(`
    INSERT INTO Categories (name)
    VALUES ('Musica'), ('Sport'), ('Arte'), ('Tecnologia'), ('Cibo'), ('Educazione'), ('Sociale'), ('Benessere')
    ON CONFLICT (name) DO NOTHING;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      event_date TIMESTAMP NOT NULL,
      location TEXT NOT NULL,
      capacity INTEGER NOT NULL CHECK (capacity > 0),
      category_id INTEGER REFERENCES Categories(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
      is_approved BOOLEAN NOT NULL DEFAULT FALSE,
      min_participants INTEGER,
      max_participants INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS EventPhotos (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES Events(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function getOrCreateUser(email, username) {
  const r = await pool.query('SELECT id FROM Users WHERE email = $1', [email]);
  if (r.rows.length) return r.rows[0].id;
  const hash = await bcrypt.hash('Password123', 10);
  const ins = await pool.query(
    'INSERT INTO Users (username, email, password_hash, role, email_verified) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [username, email, hash, 'user', true]
  );
  return ins.rows[0].id;
}

async function getCategoryId(name) {
  const r = await pool.query('SELECT id FROM Categories WHERE name = $1', [name]);
  if (r.rows.length) return r.rows[0].id;
  const ins = await pool.query('INSERT INTO Categories (name) VALUES ($1) RETURNING id', [name]);
  return ins.rows[0].id;
}

async function seedEvents() {
  const userEmail = process.env.SEED_USER_EMAIL || process.env.EMAIL_USER || 'demo.user@example.com';
  const userName = userEmail.split('@')[0];
  const userId = await getOrCreateUser(userEmail, userName);
  const catMusica = await getCategoryId('Musica');
  const catTecnologia = await getCategoryId('Tecnologia');

  // Simple duplicates guard
  const existing = await pool.query("SELECT COUNT(*)::int AS c FROM Events");
  if (existing.rows[0].c > 0) {
    console.log(`Events already present: ${existing.rows[0].c}. Skipping seed.`);
    return;
  }

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7*24*60*60*1000);
  const nextMonth = new Date(now.getTime() + 30*24*60*60*1000);

  const events = [
    {
      title: 'Concerto Live in Piazza',
      description: 'Serata musicale con band locali e street food.',
      event_date: nextWeek,
      location: 'Piazza Centrale',
      capacity: 150,
      category_id: catMusica,
      user_id: userId,
      is_approved: true
    },
    {
      title: 'Workshop Web Development',
      description: 'Introduzione pratica a React e Node.js.',
      event_date: nextMonth,
      location: 'Innovation Lab',
      capacity: 40,
      category_id: catTecnologia,
      user_id: userId,
      is_approved: true
    }
  ];

  for (const ev of events) {
    await pool.query(
      `INSERT INTO Events (title, description, event_date, location, capacity, category_id, user_id, is_approved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [ev.title, ev.description, ev.event_date, ev.location, ev.capacity, ev.category_id, ev.user_id, ev.is_approved]
    );
  }
  const count = await pool.query('SELECT COUNT(*)::int AS c FROM Events');
  console.log(`Seed completato. Eventi inseriti: ${count.rows[0].c}`);
}

async function main() {
  try {
    await ensureSchema();
    await seedEvents();
  } catch (err) {
    console.error('Errore seedSampleEvents:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();