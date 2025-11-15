// File: src/config/initSchema.js
const { pool } = require('./db');

// Inizializza lo schema del database creando le tabelle mancanti.
// Usa CREATE TABLE IF NOT EXISTS per rendere l’operazione idempotente.
async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verification_token TEXT,
        verification_token_expires TIMESTAMP,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMP,
        verification_code TEXT,
        verification_code_expires TIMESTAMP,
        login_notify_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS first_name TEXT`);
    await client.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS last_name TEXT`);
    await client.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS phone TEXT`);
    await client.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS login_notify_enabled BOOLEAN NOT NULL DEFAULT TRUE`);
    await client.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS password_reset_token TEXT`);
    await client.query(`ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP`);

    // Categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS Categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
    `);

    // Events
    await client.query(`
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

    // Registrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS Registrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
        registered_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, event_id)
      );
    `);

    // EventPhotos
    await client.query(`
      CREATE TABLE IF NOT EXISTS EventPhotos (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES Events(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ChatMessages
    await client.query(`
      CREATE TABLE IF NOT EXISTS ChatMessages (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES Events(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
        message_text TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS EmailLogs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES Users(id) ON DELETE SET NULL,
        email TEXT NOT NULL,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        meta JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS NotificationLogs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES Users(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        meta JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ReportedEvents (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES Events(id) ON DELETE CASCADE,
        reporter_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (event_id, reporter_id)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Schema DB inizializzato/validato con successo.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Errore inizializzazione schema DB:', err?.message || err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { initSchema };
