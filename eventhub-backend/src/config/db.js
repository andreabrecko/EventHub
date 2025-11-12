// EventHub/eventhub-backend/src/config/db.js
// Modulo di configurazione della connessione PostgreSQL.
// Espone un pool condiviso e una funzione di health-check/inizializzazione.

const { Pool } = require('pg'); 

// Abilita SSL solo in produzione o se esplicitamente richiesto via env
const useSSL = (process.env.DB_SSL === 'true') || (process.env.NODE_ENV === 'production');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,
    ssl: useSSL ? { rejectUnauthorized: false } : false
});

let isConnected = false;
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
        console.log('✅ Connesso al database PostgreSQL.');
    } catch (err) {
        console.error('ERRORE: Connessione al database fallita!', err.message);
        console.error('Verifica che PostgreSQL sia avviato e le variabili .env siano corrette.');
        throw err;
    }
};

module.exports = { connectDB, pool };