// EventHub/eventhub-backend/src/config/db.js
// Modulo di configurazione della connessione PostgreSQL.
// Espone un pool condiviso e una funzione di health-check/inizializzazione.

const { Pool } = require('pg'); 
const fs = require('fs');

// Abilita SSL in produzione o se richiesto. Aiven richiede SSL.
const useSSL = (process.env.DB_SSL === 'true') || (process.env.NODE_ENV === 'production');
// Controllo esplicito della verifica certificato: di default disabilitata per sviluppo
const verifySSL = process.env.DB_SSL_VERIFY === 'true';

// Supporto connection string (Aiven/Heroku): AIVEN_DATABASE_URL o DATABASE_URL
const connectionString = process.env.AIVEN_DATABASE_URL || process.env.DATABASE_URL || '';

const baseConfig = connectionString
  ? { connectionString }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 5432,
    };

// Supporto certificato CA: può arrivare come contenuto (DB_CA_CERT) o come path (DB_CA_CERT_PATH)
let caCert = null;
try {
  if (process.env.DB_CA_CERT_PATH && fs.existsSync(process.env.DB_CA_CERT_PATH)) {
    caCert = fs.readFileSync(process.env.DB_CA_CERT_PATH, 'utf8');
  } else if (process.env.DB_CA_CERT) {
    caCert = process.env.DB_CA_CERT;
  }
} catch (_) {}

const sslConfig = (useSSL || !!connectionString)
  ? (verifySSL && caCert
      ? { ca: caCert, rejectUnauthorized: true }
      : { rejectUnauthorized: false })
  : false;

const pool = new Pool({
  ...baseConfig,
  ssl: sslConfig,
  // Parametri di stabilità consigliati
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000,
});

let isConnected = false;
let lastError = null;
// Esegue una query di health-check sul DB per confermare la connettività.
// È idempotente: dopo la prima connessione, ulteriori chiamate ritornano immediatamente.
const connectDB = async () => {
  if (isConnected) return;
  const res = await pool.query('SELECT 1');
  if (res && res.rowCount >= 0) {
    isConnected = true;
    lastError = null;
    console.log('✅ Connesso al database PostgreSQL.');
  }
};

// Riprova connessione con backoff esponenziale
async function connectDBWithRetry({ retries = 5, delayMs = 1500 } = {}) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      await connectDB();
      return true;
    } catch (err) {
      lastError = { message: err.message, code: err.code || null };
      const wait = delayMs * Math.max(1, Math.pow(2, attempt));
      console.warn(`Connessione DB fallita (tentativo ${attempt + 1}/${retries + 1}): ${err.message}. Riprovo tra ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
      attempt++;
    }
  }
  return false;
}

// Keepalive/ping periodico per aggiornare stato e mantenere la sessione attiva
function startKeepAlivePing(intervalMs = 30000) {
  setInterval(async () => {
    try {
      await pool.query('SELECT 1');
      isConnected = true;
      lastError = null;
    } catch (err) {
      isConnected = false;
      lastError = { message: err.message, code: err.code || null };
      console.warn('Ping DB fallito:', err.message);
    }
  }, intervalMs).unref();
}

// Gestione errori del pool (client idle)
pool.on('error', (err) => {
  isConnected = false;
  lastError = { message: err.message, code: err.code || null };
  console.error('Pool DB error:', err.message);
});

const getDBStatus = () => ({ connected: isConnected, via: connectionString ? 'connectionString' : 'envParams', error: lastError });
module.exports = { connectDB, connectDBWithRetry, startKeepAlivePing, pool, getDBStatus };