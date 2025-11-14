// EventHub/eventhub-backend/src/config/db.js
// Modulo di configurazione della connessione PostgreSQL.
// Espone un pool condiviso e una funzione di health-check/inizializzazione.

const { Pool } = require('pg'); 

// Abilita SSL in produzione o se richiesto. Aiven richiede SSL.
const useSSL = (process.env.DB_SSL === 'true') || (process.env.NODE_ENV === 'production');

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

const sslConfig = (useSSL || !!connectionString)
  ? (
      process.env.DB_CA_CERT
        ? { ca: process.env.DB_CA_CERT }
        : { rejectUnauthorized: false }
    )
  : false;

const pool = new Pool({
  ...baseConfig,
  ssl: sslConfig,
});

let isConnected = false;
let lastError = null;
// Esegue una query di health-check sul DB per confermare la connettività.
// È idempotente: dopo la prima connessione, ulteriori chiamate ritornano immediatamente.
const connectDB = async () => {
    if (isConnected) {
        return; // Evita riconnessioni multiple
    }
    try {
        // Esegue una semplice query di health-check senza trattenere un client
        await pool.query('SELECT 1');
        isConnected = true;
        lastError = null;
        console.log('✅ Connesso al database PostgreSQL.');
    } catch (err) {
        console.error('ERRORE: Connessione al database fallita!', err.message);
        console.error('Verifica che PostgreSQL sia avviato e le variabili .env siano corrette.');
        lastError = { message: err.message, code: err.code || null };
        throw err;
    }
};

const getDBStatus = () => ({ connected: isConnected, via: connectionString ? 'connectionString' : 'envParams', error: lastError });

module.exports = { connectDB, pool, getDBStatus };